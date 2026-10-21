FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests -B

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
# Tuned for a small free-tier container: faster startup, lower memory.
ENTRYPOINT ["java","-XX:TieredStopAtLevel=1","-XX:+UseSerialGC","-XX:MaxRAMPercentage=75","-Xss512k","-jar","/app/app.jar"]
