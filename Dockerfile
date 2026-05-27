FROM eclipse-temurin:21-jdk

WORKDIR /app

COPY . /app

RUN chmod +x install.sh && ./install.sh

RUN chmod +x start.sh

CMD ["bash", "start.sh"]
