docker stop bee-router
docker rm bee-router
docker build -t bee-router .
docker run -d --name bee-router -p 20128:20128 --env-file .env -v bee-router-data:/app/data bee-router