# HirelyApp

**API endpoints**
Authentication & User Management:

POST /api/register
POST /api/login
PUT /api/users/:id (Protected)
GET /api/users/:email
GET /api/users/id/:id (Optional Auth)
POST /api/users/:userId/rate (Protected)
POST /api/users/:userId/report (Protected)
GET /api/users (Search/List Users)


Job Post Management:

POST /api/jobs (Protected)
GET /api/jobs (Optional Auth)
GET /api/jobs/:id (Optional Auth)
DELETE /api/jobs/:id (Soft Delete - Protected)
PUT /api/jobs/:id/mark-filled (Protected)
PUT /api/jobs/:id/undo-filled (Protected)


Job Interest & Assignment:

POST /api/jobs/:id/interest (Protected)
DELETE /api/jobs/:id/interest (Protected)
GET /api/jobs/:jobId/interested-users (Protected)
POST /api/jobs/:jobId/assign (Protected)
DELETE /api/jobs/:jobId/assign/:assignedUserId (Protected)


User-Specific Job Views:

GET /api/users/:userId/my-jobs (Protected)
GET /api/users/:userId/deleted-jobs (Protected)


Messaging:

POST /api/messages (Protected)
GET /api/messages/conversations (Protected)
GET /api/messages/conversation/user/:otherUserId (Protected)
