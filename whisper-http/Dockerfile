FROM ubuntu:22.04

# Install dependencies
RUN apt update && apt install -y \
    git cmake build-essential ffmpeg wget \
    libopenblas-dev libssl-dev libprotobuf-dev protobuf-compiler \
    python3 python3-pip

# Set working directory
WORKDIR /opt

# Clone whisper.cpp and checkout known good HTTP server commit
RUN git clone https://github.com/ggerganov/whisper.cpp.git
WORKDIR /opt/whisper.cpp
RUN git checkout bcf1ed01

# Build the HTTP server
RUN cmake -B build
RUN cmake --build build --target whisper-server -j

# Download a small model
RUN mkdir -p models && \
    wget -O models/ggml-small.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin

EXPOSE 8080

# Run the HTTP server
CMD ["./build/bin/whisper-server", "-m", "models/ggml-small.bin", "-l", "am", "--host", "0.0.0.0", "--port", "8080"]