FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install cryptography python-dotenv # Make sure we have auth plugins if needed for MySQL 8 and dotenv due to missing from requirements

COPY app/backend/ .

# Environment variables will be provided by docker-compose
EXPOSE 5001

# The start_app.sh script will wait for db, run app.py
CMD ["sh", "-c", "python app.py"]
