FROM node:10.15-stretch
WORKDIR /app
COPY . /app
RUN apt-get update && \
    npm install && \
    apt-get install clamav-daemon -y && \
    freshclam && \
    echo "TCPSocket 3310" >> /etc/clamav/clamd.conf && \
    echo "TCPAddr 127.0.0.1" >> /etc/clamav/clamd.conf && \
    mkdir /unscanned_files
CMD ["sh", "bootstrap.sh"]
    
