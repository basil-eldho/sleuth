FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o sleuth ./cmd/sleuth

FROM alpine:3.19
WORKDIR /app
COPY --from=builder /app/sleuth .
EXPOSE 8080
CMD ["./sleuth"]
