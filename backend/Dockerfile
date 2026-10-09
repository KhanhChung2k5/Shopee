# --- Build stage -----------------------------------------------------------
FROM eclipse-temurin:21-jdk-jammy AS build
WORKDIR /app

# Cache dependencies separately from source so code changes don't re-download them.
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -q dependency:go-offline

COPY src/ src/
RUN ./mvnw -q -DskipTests package

# --- Run stage ---------------------------------------------------------------
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

RUN useradd --no-create-home --shell /usr/sbin/nologin appuser
COPY --from=build /app/target/*.jar app.jar
RUN chown appuser:appuser app.jar
USER appuser

ENV SPRING_PROFILES_ACTIVE=prod
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
