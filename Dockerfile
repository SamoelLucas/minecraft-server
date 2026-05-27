FROM eclipse-temurin:21-jdk

WORKDIR /app

# Copy all server files into the image
COPY . /app

# Run the NeoForge installer during build so the JAR is baked into the image.
# After install.sh completes, list the directory so we can confirm the shim JAR
# was created, then remove the installer script to keep the image tidy.
RUN chmod +x install.sh && \
    ./install.sh && \
    echo "=== Files created by installer ===" && \
    ls -lh /app && \
    echo "=== Shim JAR ===" && \
    find /app -maxdepth 1 -name "neoforge-*-shim.jar" && \
    chmod +x start.sh

# Minecraft server port
EXPOSE 25565

CMD ["bash", "start.sh"]
