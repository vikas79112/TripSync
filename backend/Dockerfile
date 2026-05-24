FROM eclipse-temurin:20

WORKDIR /app

COPY . .

RUN chmod +x mvnw

RUN ./mvnw clean package -DskipTests

EXPOSE 8080

CMD ["java", "-jar", "target/tripsync-0.0.1-SNAPSHOT.jar"]