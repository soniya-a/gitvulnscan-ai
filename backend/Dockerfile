FROM python:3.11-bookworm

# Install Java and required tools
RUN apt-get update && \
    apt-get install -y \
    openjdk-17-jdk \
    wget \
    unzip \
    git && \
    rm -rf /var/lib/apt/lists/*
    RUN java -version
    RUN which java

RUN JAVA_PATH=$(readlink -f $(which java)) && \
    JAVA_HOME=$(dirname $(dirname $JAVA_PATH)) && \
    echo "Detected JAVA_HOME=$JAVA_HOME" && \
    echo "export JAVA_HOME=$JAVA_HOME" >> /etc/profile && \
    echo "export PATH=\$JAVA_HOME/bin:\$PATH" >> /etc/profile

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download OWASP Dependency-Check
RUN wget https://github.com/dependency-check/DependencyCheck/releases/download/v12.2.2/dependency-check-12.2.2-release.zip && \
    unzip dependency-check-12.2.2-release.zip && \
    mv dependency-check /opt/dependency-check && \
    chmod +x /opt/dependency-check/bin/dependency-check.sh && \
    rm dependency-check-12.2.2-release.zip

ENV DEPENDENCY_CHECK_PATH=/opt/dependency-check/bin/dependency-check.sh

COPY . .

EXPOSE 10000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "10000"]