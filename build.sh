# # Docker cmd: Build image, not proxy
# docker build -f ./projects/app/Dockerfile -t 172.29.120.226:8088/fastgpt:v4.8.10 . --build-arg name=app
# # Make cmd: Build image, not proxy
# make build name=app image=172.29.120.226:8088/fastgpt:v4.8.10

# Docker cmd: Build image with proxy
docker build -f ./projects/app/Dockerfile -t 172.29.120.226:8088/fastgpt:v4.8.10 . --build-arg name=app --build-arg proxy=taobao
# Make cmd: Build image with proxy
make build name=app image=172.29.120.226:8088/fastgpt:v4.8.10 proxy=taobao