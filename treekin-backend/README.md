# TreeKin Backend

FastAPI backend for the TreeKin environmental action platform.

## Setup

1. Create virtual environment:
```bash
python -m venv venv
venv\Scripts\activate  # Windows
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment:
```bash
copy .env.example .env
# Edit .env with your PostgreSQL credentials
```

4. Run the server:
```bash
uvicorn app.main:app --reload --port 8000
```

5. Open API docs: http://localhost:8000/docs

## Project Structure

```
app/
├── main.py          # FastAPI app entry
├── config.py        # Environment config
├── database.py      # SQLAlchemy setup
├── models/          # Database models
├── schemas/         # Pydantic schemas
├── routers/         # API routes
├── services/        # Business logic
└── ai/              # AI modules
```
