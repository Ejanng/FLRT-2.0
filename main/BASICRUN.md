
balle to run the backend run this cmds; 

"source .venv/bin/activate" from ./main
cd backend
pip install -r requirements.txt
python app.py

pero required nga adda PSQL mo tapno makaaramid ka database

if meron na PSQL,need to create .env from the main directory containing this:
FLASK_ENV=development
FLASK_DEBUG=1
SECRET_KEY=supersecretkey

DB_USER=zeus
DB_PASSWORD=password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lostandfound_db

to run the frontend do;
"npm run dev" in frontend directory

NOTE: make sure nga running jy PSQL tapno makaaramid tables;
