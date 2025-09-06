const app = require('./app');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`Server running -> http://localhost:${PORT}`);
    console.log(`Health check -> http://localhost:${PORT}/health`);
    console.log(`Documents API -> http://localhost:${PORT}/api/documents`);
});