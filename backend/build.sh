#!/usr/bin/env bash
set -e

echo "Installing Java..."

apt-get update
apt-get install -y openjdk-17-jdk unzip wget

export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH=$JAVA_HOME/bin:$PATH

java -version

echo "Installing Python dependencies..."
pip install -r requirements.txt

echo "Downloading Dependency-Check..."

wget https://github.com/dependency-check/DependencyCheck/releases/download/v12.2.2/dependency-check-12.2.2-release.zip

unzip -o dependency-check-12.2.2-release.zip

chmod +x dependency-check/bin/dependency-check.sh

echo "Dependency-Check installed."