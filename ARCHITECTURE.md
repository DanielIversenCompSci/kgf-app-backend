## This App's folder structure

### Where does stuff live?
* src = source code lives here
* routes = the paths people can visit (like /users, /posts)
* controllers = the brain that handles requests
* middleware = the security guard that checks requests first

## This App uses a PostgreQL Database

### Connecting to PostgresQL DB
Using following node modules:
* pg = Postgres client for Node.js (the "pipes" to your database)
* dotenv = loads environment variables from .env file (keeps secrets safe)

#### Initialize pipe to DB with command
echo "DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_username
DB_PASSWORD=your_password" > .env

#### Add related files to .gitignore if not already present
echo "node_modules/
.env
*.log" > .gitignore

#### Creating a sepperate file for DB config
* SOC - Database // Business Logic
* Easier to mock for future testing

