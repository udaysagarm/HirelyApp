// server/server.js

// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const app = express();
const pool = require('./db');
const bcrypt = require('bcryptjs'); // For password hashing
const jwt = require('jsonwebtoken'); // For JSON Web Tokens
const cors = require('cors'); // For Cross-Origin Resource Sharing

const PORT = process.env.PORT || 3001; // Ensure this is your chosen port (e.g., 3001)
const JWT_SECRET = process.env.JWT_SECRET; // Ensure this is set in your .env file

// ===========================================
// MIDDLEWARE
// ===========================================
// Enable CORS for all requests. This MUST come before your routes.
// It handles preflight OPTIONS requests automatically.
app.use(cors({
    origin: 'http://localhost:5173', // Explicitly allow your frontend's origin
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allow common methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Allow these headers
    credentials: true // Allow cookies/auth headers to be sent
}));

// Explicitly handle OPTIONS requests for all paths.
app.options('*', cors()); 

// Parse JSON request bodies
app.use(express.json());

// ===========================================
// AUTHENTICATION MIDDLEWARE (Modified for optional use)
// ===========================================
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Get token from "Bearer TOKEN"

    // If no token is provided, proceed without setting req.user (for optional authentication)
    if (token == null) {
        req.user = null; // Explicitly set to null if no token
        return next();
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error('JWT verification error:', err.message);
            req.user = null; 
            return next();
        }
        req.user = user.user; // Attach user payload to request (contains id, email, role)
        next(); // Proceed to the next middleware/route handler
    });
}

// Strictly protected middleware (will return error if token is missing/invalid)
// Use this for routes that absolutely REQUIRE a valid token (e.g., POST /api/jobs, PUT /api/users/:id)
function ensureAuthenticated(req, res, next) {
    authenticateToken(req, res, () => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required to access this resource.' });
        }
        next();
    });
}


// ===========================================
// ROUTES
// ===========================================

app.get('/', (req, res) => {
    console.log("Route hit: GET /");
    res.send('Hirely Backend API is running!');
});

// AUTHENTICATION ROUTES

app.post('/api/register', async (req, res) => {
    console.log("Route hit: POST /api/register");
    const { name, email, password, phone, location, preferredDistance, role } = req.body;

    if (!name || !email || !password || !location) {
        return res.status(400).json({ message: 'Please enter all required fields: name, email, password, location.' });
    }
    if (preferredDistance !== undefined && (isNaN(preferredDistance) || preferredDistance < 0)) {
        return res.status(400).json({ message: 'Preferred distance must be a non-negative number.' });
    }

    try {
        const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(409).json({ message: 'User with this email already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const newUser = await pool.query(
            `INSERT INTO users (name, email, password_hash, phone, location, preferred_distance, role)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, name, email, phone, location, preferred_distance, role, avatar_url, created_at`,
            [name, email, passwordHash, phone || null, location, preferredDistance || 0, role || 'job_seeker']
        );

        const payload = { user: { id: newUser.rows[0].id, email: newUser.rows[0].email, role: newUser.rows[0].role } };

        jwt.sign(
            payload,
            JWT_SECRET,
            { expiresIn: '1h' },
            (err, token) => {
                if (err) throw err;
                res.status(201).json({
                    message: 'User registered successfully',
                    token,
                    user: {
                        id: newUser.rows[0].id, name: newUser.rows[0].name, email: newUser.rows[0].email,
                        phone: newUser.rows[0].phone, location: newUser.rows[0].location,
                        preferredDistance: newUser.rows[0].preferred_distance, role: newUser.rows[0].role,
                        avatar: newUser.rows[0].avatar_url
                    }
                });
            }
        );

    } catch (err) {
        console.error('Error during user registration:', err);
        if (err.code === '23505') { return res.status(409).json({ message: 'This email is already in use by another account.' }); }
        res.status(500).send('Server Error during registration.');
    }
});

app.post('/api/login', async (req, res) => {
    console.log("Route hit: POST /api/login");
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Please enter email and password.' });
    }

    try {
        const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (user.rows.length === 0) {
            return res.status(400).json({ message: 'Invalid Credentials' });
        }

        const storedPasswordHash = user.rows[0].password_hash;
        const isMatch = await bcrypt.compare(password, storedPasswordHash);

        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid Credentials' });
        }

        const payload = { user: { id: user.rows[0].id, email: user.rows[0].email, role: user.rows[0].role } };

        jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
            if (err) { console.error('JWT signing error:', err); throw err; }
            res.json({
                message: 'Logged in successfully',
                token,
                user: {
                    id: user.rows[0].id, name: user.rows[0].name, email: user.rows[0].email,
                    phone: user.rows[0].phone, location: user.rows[0].location,
                    preferredDistance: user.rows[0].preferred_distance, role: user.rows[0].role,
                    avatar: user.rows[0].avatar_url
                }
            });
        });

    } catch (err) {
        console.error('Error during user login:', err);
        res.status(500).send('Server Error during login.');
    }
});

// ===========================================
// PROTECTED ROUTES (Using ensureAuthenticated middleware for strict protection)
// ===========================================

app.put('/api/users/:id', ensureAuthenticated, async (req, res) => {
    console.log("Route hit: PUT /api/users/:id");
    const userId = Number(req.params.id);
    const { name, email, phone, location, preferredDistance, avatar_url } = req.body;

    if (req.user.id !== userId) {
        return res.status(403).json({ message: 'Unauthorized: You can only update your own profile.' });
    }

    if (!name || !email || !location) {
        return res.status(400).json({ message: 'Name, email, and location are required fields.' });
    }
    if (preferredDistance !== undefined && (isNaN(preferredDistance) || preferredDistance < 0)) {
        return res.status(400).json({ message: 'Preferred distance must be a non-negative number.' });
    }

    try {
        const updatedUser = await pool.query(
            `UPDATE users SET name = $1, email = $2, phone = $3, location = $4, preferred_distance = $5, avatar_url = $7, updated_at = NOW()
             WHERE id = $6
             RETURNING id, name, email, phone, location, preferred_distance, role, avatar_url, created_at, updated_at, rating, total_jobs_worked, total_hours_worked`,
            [name, email, phone || null, location, preferredDistance || 0, userId, avatar_url || null]
        );

        if (updatedUser.rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.json(updatedUser.rows[0]);

    } catch (err) {
        console.error('Error updating user profile:', err);
        if (err.code === '23505') { return res.status(409).json({ message: 'This email is already in use by another account.' }); }
        res.status(500).send('Server Error updating profile.');
    }
});


app.post('/api/jobs', ensureAuthenticated, async (req, res) => {
    console.log("Route hit: POST /api/jobs");
    const {
        title, description, pay, pay_type, category,
        startTime, endTime, totalHours, location,
        private_details, private_image_urls
    } = req.body;

    if (!req.user.id) {
        return res.status(401).json({ message: 'Unauthorized: User ID not found in token.' });
    }

    if (!title || !description || !pay || !pay_type || !category || !startTime || !endTime || !location) {
        return res.status(400).json({ message: 'Missing required job fields.' });
    }
    if (isNaN(pay) || pay <= 0) {
        return res.status(400).json({ message: 'Pay must be a positive number.' });
    }
    if (new Date(startTime) >= new Date(endTime)) {
        return res.status(400).json({ message: 'End time must be after start time.' });
    }
    if (isNaN(totalHours) || totalHours <= 0) {
        return res.status(400).json({ message: 'Total hours must be a positive number.' });
    }

    try {
        const newJob = await pool.query(
            `INSERT INTO jobs (title, description, pay, pay_type, category, start_time, end_time, total_hours, location, posted_by_user_id, private_details, private_image_urls)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             RETURNING id, title, description, pay, pay_type, category, start_time, end_time, total_hours, location, posted_by_user_id, status, created_at`,
            [
                title, description, pay, pay_type, category,
                startTime, endTime, totalHours, location, req.user.id,
                private_details || null, private_image_urls || null
            ]
        );

        res.status(201).json({ message: 'Job posted successfully!', job: newJob.rows[0] });

    } catch (err) {
        console.error('Error posting job:', err);
        res.status(500).send('Server Error posting job.');
    }
});

app.get('/api/jobs', authenticateToken, async (req, res) => {
    console.log("Route hit: GET /api/jobs");
    const { category, location, minPay, maxPay, keywords } = req.query;
    const currentUserId = req.user ? req.user.id : null; 

    let query = `
        SELECT
            j.*,
            u.name as posted_by_name,
            u.avatar_url as posted_by_avatar,
            u.email as posted_by_email,
            u.phone as posted_by_phone,
            (SELECT COUNT(*) FROM job_interests WHERE job_id = j.id) AS interested_count,
            EXISTS(SELECT 1 FROM job_interests WHERE job_id = j.id AND user_id = COALESCE($1::integer, 0)) AS is_interested_by_current_user
        FROM jobs j
        JOIN users u ON j.posted_by_user_id = u.id
        LEFT JOIN job_interests ji ON j.id = ji.job_id
        WHERE 1=1 AND j.deleted_at IS NULL
    `;
    const params = [currentUserId];
    let paramIndex = 2;

    if (category) {
        query += ` AND j.category ILIKE $${paramIndex++}`;
        params.push(`%${category}%`);
    }
    if (location) {
        query += ` AND j.location ILIKE $${paramIndex++}`;
        params.push(`%${location}%`);
    }
    if (minPay && !isNaN(minPay)) {
        query += ` AND j.pay >= $${paramIndex++}`;
        params.push(parseFloat(minPay));
    }
    if (maxPay && !isNaN(maxPay)) {
        query += ` AND j.pay <= $${paramIndex++}`;
        params.push(parseFloat(maxPay));
    }
    if (keywords) {
        query += ` AND (j.title ILIKE $${paramIndex} OR j.description ILIKE $${paramIndex++})`;
        params.push(`%${keywords}%`);
    }

    query += ` GROUP BY j.id, u.id ORDER BY j.created_at DESC`;

    try {
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching jobs:', err);
        res.status(500).send('Server Error fetching jobs.');
    }
});

app.get('/api/jobs/:id', authenticateToken, async (req, res) => { // Added authenticateToken to get req.user
    console.log("Route hit: GET /api/jobs/:id");
    const jobId = Number(req.params.id);
    const currentUserId = req.user ? req.user.id : null; 

    if (!jobId || isNaN(jobId)) {
        return res.status(400).json({ message: 'Invalid Job ID.' });
    }

    try {
        let jobData;

        const publicJobQuery = `
            SELECT
                j.*,
                u.name as posted_by_name,
                u.avatar_url as posted_by_avatar,
                u.email as posted_by_email,
                u.phone as posted_by_phone
            FROM jobs j
            JOIN users u ON j.posted_by_user_id = u.id
            WHERE j.id = $1 AND j.deleted_at IS NULL`;
        
        const jobResult = await pool.query(publicJobQuery, [jobId]);

        if (jobResult.rows.length === 0) {
            return res.status(404).json({ message: 'Job not found or deleted.' });
        }
        jobData = jobResult.rows[0];

        if (currentUserId && jobData.posted_by_user_id === currentUserId) {
            const privateDetailsQuery = `
                SELECT private_details, private_image_urls
                FROM jobs
                WHERE id = $1`;
            const privateResult = await pool.query(privateDetailsQuery, [jobId]);
            
            if (privateResult.rows.length > 0) {
                jobData.private_details = privateResult.rows[0].private_details;
                jobData.private_image_urls = privateResult.rows[0].private_image_urls;
            }
        }
        
        if (currentUserId) { 
            const assignedDetailsQuery = `
                SELECT 
                    assigned_location, assigned_details, assigned_image_urls
                FROM job_applications
                WHERE job_id = $1 AND applicant_user_id = $2 AND status = 'assigned'`;
            const assignedResult = await pool.query(assignedDetailsQuery, [jobId, currentUserId]);

            if (assignedResult.rows.length > 0) {
                jobData.assigned_location_for_user = assignedResult.rows[0].assigned_location;
                jobData.assigned_details_for_user = assignedResult.rows[0].assigned_details;
                jobData.assigned_image_urls_for_user = assignedResult.rows[0].assigned_image_urls;
            }
        }


        res.json(jobData);
    } catch (err) {
        console.error('Error fetching single job:', err);
        res.status(500).send('Server Error fetching job details.');
    }
});


app.post('/api/jobs/:id/interest', ensureAuthenticated, async (req, res) => {
    console.log("Route hit: POST /api/jobs/:id/interest");
    const jobId = Number(req.params.id);
    const userId = req.user.id;

    if (!jobId || isNaN(jobId)) {
        return res.status(400).json({ message: 'Invalid Job ID.' });
    }

    try {
        const existingInterest = await pool.query(
            'SELECT * FROM job_interests WHERE job_id = $1 AND user_id = $2',
            [jobId, userId]
        );

        if (existingInterest.rows.length > 0) {
            return res.status(409).json({ message: 'User already expressed interest in this job.' });
        }

        await pool.query(
            'INSERT INTO job_interests (job_id, user_id) VALUES ($1, $2)',
            [jobId, userId]
        );

        const updatedCount = await pool.query(
            'SELECT COUNT(*) FROM job_interests WHERE job_id = $1',
            [jobId]
        );

        res.status(200).json({
            message: 'Interest recorded successfully!',
            jobId: jobId,
            interestedCount: parseInt(updatedCount.rows[0].count, 10),
            isInterestedByCurrentUser: true
        });

    } catch (err) {
        console.error('Error recording interest:', err);
        res.status(500).send('Server Error recording interest.');
    }
});


app.delete('/api/jobs/:id/interest', ensureAuthenticated, async (req, res) => {
    console.log("Route hit: DELETE /api/jobs/:id/interest");
    const jobId = Number(req.params.id);
    const userId = req.user.id;

    if (!jobId || isNaN(jobId)) {
        return res.status(400).json({ message: 'Invalid Job ID.' });
    }

    try {
        const existingInterest = await pool.query(
            'SELECT * FROM job_interests WHERE job_id = $1 AND user_id = $2',
            [jobId, userId]
        );

        if (existingInterest.rows.length === 0) {
            return res.status(404).json({ message: 'Interest not found for this user and job.' });
        }

        await pool.query(
            'DELETE FROM job_interests WHERE job_id = $1 AND user_id = $2',
            [jobId, userId]
        );

        const updatedCount = await pool.query(
            'SELECT COUNT(*) FROM job_interests WHERE job_id = $1',
            [jobId]
        );

        res.status(200).json({
            message: 'Interest removed successfully!',
            jobId: jobId,
            interestedCount: parseInt(updatedCount.rows[0].count, 10),
            isInterestedByCurrentUser: false
        });

    } catch (err) {
        console.error('Error removing interest:', err);
        res.status(500).send('Server Error removing interest.');
    }
});


app.get('/api/users/:email', async (req, res) => {
    console.log("Route hit: GET /api/users/:email");
    const userEmail = req.params.email;

    try {
        const user = await pool.query(
            `SELECT 
                id, name, email, phone, location, avatar_url, role,
                (SELECT AVG(rating) FROM user_ratings WHERE rated_user_id = users.id) AS average_rating,
                (SELECT COUNT(rating) FROM user_ratings WHERE rated_user_id = users.id) AS total_ratings_count
             FROM users WHERE email = $1`,
            [userEmail]
        );

        if (user.rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.json(user.rows[0]);
    } catch (err) {
        console.error('Error fetching user by email:', err);
        res.status(500).send('Server Error fetching user profile.');
    }
});

app.get('/api/users/id/:id', authenticateToken, async (req, res) => { // Added authenticateToken
    console.log("Route hit: GET /api/users/id/:id");
    const userId = Number(req.params.id);
    const currentUserId = req.user ? req.user.id : null; 

    try {
        const user = await pool.query(
            `SELECT 
                id, name, email, phone, location, avatar_url, role,
                (SELECT AVG(rating) FROM user_ratings WHERE rated_user_id = users.id) AS average_rating,
                (SELECT COUNT(rating) FROM user_ratings WHERE rated_user_id = users.id) AS total_ratings_count,
                (SELECT rating FROM user_ratings WHERE rated_user_id = $1 AND rater_user_id = $2) AS my_rating
             FROM users WHERE id = $1`,
            [userId, currentUserId]
        );

        if (user.rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.json(user.rows[0]);
    } catch (err) {
        console.error('Error fetching user by ID:', err);
        res.status(500).send('Server Error fetching user profile by ID.');
    }
});

app.post('/api/users/:userId/rate', ensureAuthenticated, async (req, res) => {
    console.log("Route hit: POST /api/users/:userId/rate");
    const ratedUserId = Number(req.params.userId);
    const raterUserId = req.user.id;
    const { rating, comment } = req.body;

    if (!ratedUserId || isNaN(ratedUserId) || !rating || isNaN(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Invalid user ID or rating (must be 1-5).' });
    }
    if (ratedUserId === raterUserId) {
        return res.status(400).json({ message: 'You cannot rate yourself.' });
    }

    try {
        await pool.query(
            `INSERT INTO user_ratings (rated_user_id, rater_user_id, rating, comment)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (rated_user_id, rater_user_id) DO UPDATE SET
                 rating = EXCLUDED.rating,
                 comment = EXCLUDED.comment,
                 created_at = NOW()
            `,
            [ratedUserId, raterUserId, rating, comment || null]
        );

        const updatedStats = await pool.query(
            `SELECT AVG(rating) AS average_rating, COUNT(rating) AS total_ratings_count
             FROM user_ratings WHERE rated_user_id = $1`,
            [ratedUserId]
        );

        res.status(201).json({ 
            message: 'Rating submitted successfully!',
            average_rating: parseFloat(updatedStats.rows[0].average_rating),
            total_ratings_count: parseInt(updatedStats.rows[0].total_ratings_count)
        });

    } catch (err) {
        console.error('Error submitting rating:', err);
        res.status(500).send('Server Error submitting rating.');
    }
});

app.post('/api/users/:userId/report', ensureAuthenticated, async (req, res) => {
    console.log("Route hit: POST /api/users/:userId/report");
    const reportedUserId = Number(req.params.userId);
    const reporterUserId = req.user.id;
    const { reason, details } = req.body;

    if (!reportedUserId || isNaN(reportedUserId) || !reason.trim()) {
        return res.status(400).json({ message: 'Invalid user ID or missing report reason.' });
    }
    if (reportedUserId === reporterUserId) {
        return res.status(400).json({ message: 'You cannot report yourself.' });
    }

    try {
        await pool.query(
            `INSERT INTO user_reports (reported_user_id, reporter_user_id, reason, details)
             VALUES ($1, $2, $3, $4)`,
            [reportedUserId, reporterUserId, reason.trim(), details || null]
        );

        res.status(201).json({ message: 'Report submitted successfully. Thank you for your feedback.' });

    } catch (err) {
        console.error('Error submitting report:', err);
        res.status(500).send('Server Error submitting report.');
    }
});


app.post('/api/messages', ensureAuthenticated, async (req, res) => {
    console.log("Route hit: POST /api/messages");
    const { receiverId, content, jobId } = req.body;
    const senderId = req.user.id;

    if (!receiverId || !content) {
        return res.status(400).json({ message: 'Receiver ID and message content are required.' });
    }

    try {
        const newMessage = await pool.query(
            `INSERT INTO messages (sender_id, receiver_id, content, job_id)
             VALUES ($1, $2, $3, $4)
             RETURNING id, sender_id, receiver_id, content, sent_at, is_read`,
            [senderId, receiverId, content, jobId || null]
        );
        res.status(201).json({ message: 'Message sent successfully!', message: newMessage.rows[0] });
    } catch (err) {
        console.error('Error sending message:', err);
        res.status(500).send('Server Error sending message.');
    }
});

app.get('/api/messages/conversations', ensureAuthenticated, async (req, res) => {
    console.log("Route hit: GET /api/messages/conversations");
    const userId = req.user.id;

    try {
        const conversations = await pool.query(
            `SELECT DISTINCT ON (
                CASE
                    WHEN m.sender_id = $1 THEN m.receiver_id
                    ELSE m.sender_id
                END
            ) AS participant_id,
            u.name AS participant_name,
            u.avatar_url AS participant_avatar,
            m.content AS last_message_content,
            m.sent_at AS last_message_sent_at,
            m.sender_id AS last_message_sender_id,
            (SELECT COUNT(*) FROM messages WHERE receiver_id = $1 AND sender_id = (CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END) AND is_read = FALSE) AS unread_count
            FROM messages m
            JOIN users u ON u.id = (CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END)
            WHERE m.sender_id = $1 OR m.receiver_id = $1
            ORDER BY
                CASE
                    WHEN m.sender_id = $1 THEN m.receiver_id
                    ELSE m.sender_id
                END,
            m.sent_at DESC;`,
            [userId]
        );
        res.json(conversations.rows);

    } catch (err) {
        console.error('Error fetching conversations:', err);
        res.status(500).send('Server Error fetching conversations.');
    }
});

app.get('/api/messages/conversation/user/:otherUserId', ensureAuthenticated, async (req, res) => {
    console.log("Route hit: GET /api/messages/conversation/user/:otherUserId");
    const userId = req.user.id;
    const otherUserId = req.params.otherUserId;

    try {
        const chatHistory = await pool.query(
            `SELECT m.id, m.sender_id, m.receiver_id, m.content, m.sent_at, m.is_read,
                    s.name as sender_name, s.avatar_url as sender_avatar,
                    r.name as receiver_name, r.avatar_url as receiver_avatar
             FROM messages m
             JOIN users s ON m.sender_id = s.id
             JOIN users r ON m.receiver_id = r.id
             WHERE (m.sender_id = $1 AND m.receiver_id = $2)
                OR (m.sender_id = $2 AND m.receiver_id = $1)
             ORDER BY m.sent_at ASC`,
            [userId, otherUserId]
        );

        await pool.query(
            `UPDATE messages SET is_read = TRUE
             WHERE sender_id = $2 AND receiver_id = $1 AND is_read = FALSE`,
            [userId, otherUserId]
        );

        res.json(chatHistory.rows);

    } catch (err) {
        console.error('Error fetching chat history:', err);
        res.status(500).send('Server Error fetching chat history.');
    }
});


// ===========================================
// NEW: USER SEARCH ROUTE
// GET /api/users - Fetch users with filters (Publicly accessible)
// ===========================================
app.get('/api/users', async (req, res) => {
    console.log("Route hit: GET /api/users");
    const { keywords, location, role } = req.query;

    let query = `
        SELECT
            id, name, email, phone, location, avatar_url, role,
            (SELECT AVG(rating) FROM user_ratings WHERE rated_user_id = users.id) AS average_rating,
            (SELECT COUNT(rating) FROM user_ratings WHERE rated_user_id = users.id) AS total_ratings_count
        FROM users
        WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (keywords) {
        query += ` AND (name ILIKE $${paramIndex} OR email ILIKE $${paramIndex++})`;
        params.push(`%${keywords}%`);
    }
    if (location) {
        query += ` AND location ILIKE $${paramIndex++}`;
        params.push(`%${location}%`);
    }
    if (role) {
        query += ` AND role ILIKE $${paramIndex++}`;
        params.push(`%${role}%`);
    }

    query += ` ORDER BY name ASC`;

    try {
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).send('Server Error fetching users.');
    }
});


// ===========================================
// NEW: MY JOBS ENDPOINT
// GET /api/users/:userId/my-jobs - Fetch jobs posted by or assigned to a specific user
// ===========================================
app.get('/api/users/:userId/my-jobs', ensureAuthenticated, async (req, res) => {
    console.log("Route hit: GET /api/users/:userId/my-jobs");
    const userId = Number(req.params.userId);

    if (req.user.id !== userId) {
        return res.status(403).json({ message: 'Unauthorized: You can only view your own jobs.' });
    }

    try {
        // Query for jobs posted by the user
        const postedJobsQuery = `
            SELECT
                j.*,
                u.name as posted_by_name,
                u.avatar_url as posted_by_avatar,
                u.email as posted_by_email,
                u.phone as posted_by_phone,
                (SELECT COUNT(*) FROM job_interests WHERE job_id = j.id) AS interested_count,
                EXISTS(SELECT 1 FROM job_interests WHERE job_id = j.id AND user_id = $1) AS is_interested_by_current_user,
                'posted' AS job_type
            FROM jobs j
            JOIN users u ON j.posted_by_user_id = u.id
            LEFT JOIN job_interests ji ON j.id = ji.job_id
            WHERE j.posted_by_user_id = $1 AND j.deleted_at IS NULL
            GROUP BY j.id, u.id`;
        const postedJobsResult = await pool.query(postedJobsQuery, [userId]);

        // Query for jobs assigned to the user
        const assignedJobsQuery = `
            SELECT
                j.*,
                u_poster.name as posted_by_name,
                u_poster.avatar_url as posted_by_avatar,
                u_poster.email as posted_by_email,
                u_poster.phone as posted_by_phone,
                (SELECT COUNT(*) FROM job_interests WHERE job_id = j.id) AS interested_count,
                TRUE AS is_interested_by_current_user,
                ja.status AS application_status,
                ja.assigned_location,
                ja.assigned_details,
                ja.assigned_image_urls,
                ja.assigned_at,
                'assigned_to_me' AS job_type
            FROM jobs j
            JOIN job_applications ja ON j.id = ja.job_id
            JOIN users u_poster ON j.posted_by_user_id = u_poster.id
            WHERE ja.applicant_user_id = $1 AND ja.status = 'assigned' AND j.deleted_at IS NULL
            GROUP BY j.id, u_poster.id, ja.status, ja.assigned_location, ja.assigned_details, ja.assigned_image_urls, ja.assigned_at`;
        const assignedJobsResult = await pool.query(assignedJobsQuery, [userId]);

        const allMyJobs = [...postedJobsResult.rows, ...assignedJobsResult.rows];

        allMyJobs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        res.json(allMyJobs);
    } catch (err) {
        console.error('Error fetching my jobs:', err);
        res.status(500).send('Server Error fetching my jobs.');
    }
});

// NEW: GET /api/users/:userId/deleted-jobs - Fetch jobs soft-deleted by a user
app.get('/api/users/:userId/deleted-jobs', ensureAuthenticated, async (req, res) => {
    console.log("Route hit: GET /api/users/:userId/deleted-jobs");
    const userId = Number(req.params.userId);

    if (req.user.id !== userId) {
        return res.status(403).json({ message: 'Unauthorized: You can only view your own deleted jobs.' });
    }

    try {
        const deletedJobs = await pool.query(
            `SELECT
                j.*,
                u.name as posted_by_name,
                u.avatar_url as posted_by_avatar,
                u.email as posted_by_email,
                u.phone as posted_by_phone,
                'deleted' AS job_type
            FROM jobs j
            JOIN users u ON j.posted_by_user_id = u.id
            WHERE j.posted_by_user_id = $1 AND j.deleted_at IS NOT NULL
            ORDER BY j.deleted_at DESC`,
            [userId]
        );
        res.json(deletedJobs.rows);
    } catch (err) {
        console.error('Error fetching deleted jobs:', err);
        res.status(500).send('Server Error fetching deleted jobs.');
    }
});


// ===========================================
// NEW: MARK JOB AS FILLED ENDPOINT
// PUT /api/jobs/:id/mark-filled - Mark a job as filled
// ===========================================
app.put('/api/jobs/:id/mark-filled', ensureAuthenticated, async (req, res) => {
    console.log("Route hit: PUT /api/jobs/:id/mark-filled");
    const jobId = Number(req.params.id);
    const userId = req.user.id;

    if (!jobId || isNaN(jobId)) {
        return res.status(400).json({ message: 'Invalid Job ID.' });
    }

    try {
        const job = await pool.query('SELECT posted_by_user_id FROM jobs WHERE id = $1', [jobId]);
        if (job.rows.length === 0) {
            return res.status(404).json({ message: 'Job not found.' });
        }
        if (job.rows[0].posted_by_user_id !== userId) {
            return res.status(403).json({ message: 'Unauthorized: You can only mark your own jobs as filled.' });
        }

        const updatedJob = await pool.query(
            `UPDATE jobs SET status = 'filled', updated_at = NOW()
             WHERE id = $1
             RETURNING id, status`,
            [jobId]
        );

        console.log(`Job ${jobId} marked as filled.`);

        res.status(200).json({ message: 'Job marked as filled successfully!', job: updatedJob.rows[0] });

    } catch (err) {
        console.error('Error marking job as filled:', err);
        res.status(500).send('Server Error marking job as filled.');
    }
});

// NEW: PUT /api/jobs/:id/undo-filled - Undo mark a job as filled
app.put('/api/jobs/:id/undo-filled', ensureAuthenticated, async (req, res) => {
    console.log("Route hit: PUT /api/jobs/:id/undo-filled");
    const jobId = Number(req.params.id);
    const userId = req.user.id;

    if (!jobId || isNaN(jobId)) {
        return res.status(400).json({ message: 'Invalid Job ID.' });
    }

    try {
        const job = await pool.query('SELECT posted_by_user_id, status FROM jobs WHERE id = $1', [jobId]);
        if (job.rows.length === 0) {
            return res.status(404).json({ message: 'Job not found.' });
        }
        if (job.rows[0].posted_by_user_id !== userId) {
            return res.status(403).json({ message: 'Unauthorized: You can only undo mark as filled for your own jobs.' });
        }
        if (job.rows[0].status !== 'filled') {
            return res.status(400).json({ message: 'Job is not currently marked as filled.' });
        }

        const hasActiveAssignments = await pool.query(
            `SELECT 1 FROM job_applications WHERE job_id = $1 AND status = 'assigned' LIMIT 1`,
            [jobId]
        );
        const newStatus = hasActiveAssignments.rows.length > 0 ? 'assigned' : 'open';

        const updatedJob = await pool.query(
            `UPDATE jobs SET status = $2, updated_at = NOW()
             WHERE id = $1
             RETURNING id, status`,
            [jobId, newStatus]
        );

        console.log(`Job ${jobId} status reverted from 'filled' to '${newStatus}'.`);

        res.status(200).json({ message: `Job status reverted to '${newStatus}' successfully!`, job: updatedJob.rows[0] });

    } catch (err) {
        console.error('Error undoing mark as filled:', err);
        res.status(500).send('Server Error undoing mark as filled.');
    }
});


// ===========================================
// GET INTERESTED USERS FOR A POSTED JOB
// ===========================================
app.get('/api/jobs/:jobId/interested-users', ensureAuthenticated, async (req, res) => {
    console.log("Route hit: GET /api/jobs/:jobId/interested-users");
    const jobId = Number(req.params.jobId);
    const userId = req.user.id;

    if (!jobId || isNaN(jobId)) {
        return res.status(400).json({ message: 'Invalid Job ID.' });
    }

    try {
        const job = await pool.query('SELECT posted_by_user_id FROM jobs WHERE id = $1', [jobId]);
        if (job.rows.length === 0) {
            return res.status(404).json({ message: 'Job not found.' });
        }
        if (job.rows[0].posted_by_user_id !== userId) {
            return res.status(403).json({ message: 'Unauthorized: You can only view interested users for your own jobs.' });
        }

        const interestedUsers = await pool.query(
            `SELECT
                ji.user_id AS id,
                u.name,
                u.email,
                u.avatar_url,
                u.phone,
                u.location,
                (SELECT AVG(rating) FROM user_ratings WHERE rated_user_id = u.id) AS average_rating,
                (SELECT COUNT(rating) FROM user_ratings WHERE rated_user_id = u.id) AS total_ratings_count,
                u.total_jobs_worked,
                u.total_hours_worked,
                ja.status as application_status
            FROM job_interests ji
            JOIN users u ON ji.user_id = u.id
            LEFT JOIN job_applications ja ON ji.job_id = ja.job_id AND ji.user_id = ja.applicant_user_id
            WHERE ji.job_id = $1
            ORDER BY ji.created_at DESC`,
            [jobId]
        );

        res.json(interestedUsers.rows);

    } catch (err) {
        console.error('Error fetching interested users:', err);
        res.status(500).send('Server Error fetching interested users.');
    }
});


// ===========================================
// ASSIGN JOB TO USERS ENDPOINT
// POST /api/jobs/:jobId/assign
// ===========================================
app.post('/api/jobs/:jobId/assign', ensureAuthenticated, async (req, res) => {
    console.log("Route hit: POST /api/jobs/:jobId/assign");
    const jobId = Number(req.params.jobId);
    const employerId = req.user.id;
    const { assigned_user_id, assigned_location, assigned_details, assigned_image_urls } = req.body;

    if (!jobId || isNaN(jobId) || !assigned_user_id || isNaN(assigned_user_id) || !assigned_location || !assigned_details) {
        return res.status(400).json({ message: 'Missing required assignment details: jobId, assigned_user_id, location, details.' });
    }

    try {
        const job = await pool.query('SELECT posted_by_user_id, status FROM jobs WHERE id = $1', [jobId]);
        if (job.rows.length === 0) {
            return res.status(404).json({ message: 'Job not found.' });
        }
        if (job.rows[0].posted_by_user_id !== employerId) {
            return res.status(403).json({ message: 'Unauthorized: You can only assign your own jobs.' });
        }
        if (job.rows[0].status === 'filled') {
            return res.status(400).json({ message: 'Job is already filled and cannot be assigned.' });
        }

        const applicationStatus = 'assigned'; 

        const result = await pool.query(
            `INSERT INTO job_applications (job_id, applicant_user_id, status, assigned_location, assigned_details, assigned_image_urls, assigned_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW())
             ON CONFLICT (job_id, applicant_user_id) DO UPDATE
             SET status = EXCLUDED.status,
                 assigned_location = EXCLUDED.assigned_location,
                 assigned_details = EXCLUDED.assigned_details,
                 assigned_image_urls = EXCLUDED.assigned_image_urls,
                 assigned_at = NOW()
             RETURNING *`,
            [jobId, assigned_user_id, applicationStatus, assigned_location, assigned_details, assigned_image_urls || null]
        );

        console.log(`Job ${jobId} assigned to User ${assigned_user_id}.`);

        res.status(200).json({
            message: 'Job assigned successfully!',
            assignment: result.rows[0],
            jobStatus: job.rows[0].status
        });

    } catch (err) {
        console.error('Error assigning job:', err);
        res.status(500).send('Server Error assigning job.');
    }
});


// ===========================================
// DELETE ASSIGNMENT ENDPOINT
// DELETE /api/jobs/:jobId/assign/:assignedUserId
// ===========================================
app.delete('/api/jobs/:jobId/assign/:assignedUserId', ensureAuthenticated, async (req, res) => {
    console.log("Route hit: DELETE /api/jobs/:jobId/assign/:assignedUserId");
    const jobId = Number(req.params.jobId);
    const assignedUserId = Number(req.params.assignedUserId);
    const authenticatedUserId = req.user.id;

    if (!jobId || isNaN(jobId) || !assignedUserId || isNaN(assignedUserId)) {
        return res.status(400).json({ message: 'Invalid Job ID or Assigned User ID.' });
    }

    try {
        const job = await pool.query('SELECT posted_by_user_id FROM jobs WHERE id = $1', [jobId]);
        if (job.rows.length === 0) {
            return res.status(404).json({ message: 'Job not found.' });
        }
        
        const isPoster = (job.rows[0].posted_by_user_id === authenticatedUserId);
        const isAssignedWorkerCancellingSelf = (assignedUserId === authenticatedUserId);

        if (!isPoster && !isAssignedWorkerCancellingSelf) {
            return res.status(403).json({ message: 'Unauthorized: You can only unassign your own jobs or cancel your own assignment.' });
        }

        const deleteResult = await pool.query(
            `DELETE FROM job_applications WHERE job_id = $1 AND applicant_user_id = $2 AND status = 'assigned' RETURNING *`,
            [jobId, assignedUserId]
        );

        if (deleteResult.rows.length === 0) {
            return res.status(404).json({ message: 'Assignment not found for this user and job, or job not in assigned status.' });
        }

        const remainingAssignments = await pool.query(
            `SELECT 1 FROM job_applications WHERE job_id = $1 AND status = 'assigned' LIMIT 1`,
            [jobId]
        );

        if (remainingAssignments.rows.length === 0) {
            await pool.query(`UPDATE jobs SET status = 'open', updated_at = NOW() WHERE id = $1 AND status = 'assigned'`, [jobId]);
        }

        console.log(`Job ${jobId} unassigned from User ${assignedUserId}.`);

        res.status(200).json({ message: 'Job unassigned successfully!', jobId: jobId, unassignedUserId: assignedUserId });

    } catch (err) {
        console.error('Error unassigning job:', err);
        res.status(500).send('Server Error unassigning job.');
    }
});

// NEW: DELETE /api/jobs/:id - Soft delete a job posting
app.delete('/api/jobs/:id', ensureAuthenticated, async (req, res) => {
    console.log("Route hit: DELETE /api/jobs/:id (soft delete)");
    const jobId = Number(req.params.id);
    const userId = req.user.id;

    if (!jobId || isNaN(jobId)) {
        return res.status(400).json({ message: 'Invalid Job ID.' });
    }

    try {
        const job = await pool.query('SELECT posted_by_user_id, status FROM jobs WHERE id = $1', [jobId]);
        if (job.rows.length === 0) {
            return res.status(404).json({ message: 'Job not found.' });
        }
        if (job.rows[0].posted_by_user_id !== userId) {
            return res.status(403).json({ message: 'Unauthorized: You can only delete your own jobs.' });
        }
        if (job.rows[0].status === 'filled') {
            return res.status(400).json({ message: 'Cannot delete a job that is already marked as filled.' });
        }

        const updatedJob = await pool.query(
            `UPDATE jobs SET deleted_at = NOW(), updated_at = NOW()
             WHERE id = $1
             RETURNING id, deleted_at`,
            [jobId]
        );

        await pool.query(
            `UPDATE job_applications SET status = 'job_deleted', updated_at = NOW()
             WHERE job_id = $1 AND status IN ('assigned', 'interested', 'pending')`,
            [jobId]
        );

        console.log(`Job ${jobId} soft-deleted by user ${userId}.`);
        res.status(200).json({ message: 'Job successfully deleted (moved to trash).', job: updatedJob.rows[0] });

    } catch (err) {
        console.error('Error soft-deleting job:', err);
        res.status(500).send('Server Error soft-deleting job.');
    }
});


// ===========================================
// GLOBAL ERROR HANDLING
// ===========================================

// Custom AppError class for handling operational errors
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true; // Mark as operational error
        Error.captureStackTrace(this, this.constructor);
    }
}

// Handle undefined routes
app.all('*', (req, res, next) => {
    console.log(`Route not found: ${req.originalUrl}`);
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global error handler middleware
app.use((err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    console.error('GLOBAL ERROR CAUGHT:', err);

    res.status(err.statusCode).json({
        status: err.status,
        message: err.isOperational ? err.message : 'Something went wrong on the server!'
    });
});


// ===========================================
// START SERVER
// ===========================================
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});