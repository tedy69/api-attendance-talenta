# Attendance Talenta API

Welcome to the Attendance Talenta API! This API enables you to manage employee attendance using the Talenta platform. Simplify workforce management and effortlessly track check-ins and check-outs.

## Table of Contents

- [Features](#features)
- [Getting Started](#getting-started)
- [Endpoints](#endpoints)
- [Request and Response Examples](#request-and-response-examples)
- [Error Handling](#error-handling)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Check-In and Check-Out:** Check-in/check-out from anywhere, not limited to office location.

## Getting Started

1. **Clone the repository:**

   ```bash
   git clone https://github.com/tedy69/api-attendance-talenta.git
   ```

2. **Install dependencies:**

   ```bash
   cd api-attendance-talenta
   npm install
   ```

3. **Set up environment variables:**

   Create a `.env` file based on `.env.example` and provide the required configuration values.

4. **Start the server:**

   ```bash
   npm start
   ```

   The API will be available at `http://localhost:3000`.

## Endpoints

- `POST /`: Record employee check-in and check-out.

## Request and Response Examples

### Check-In (POST /)

**Request:**

```http
POST /
Content-Type: application/json

{
  "LOCATION_TYPE": "HOME",
  "ACCOUNT_EMAIL": "gmail@tedyfazrin.com",
  "ACCOUNT_PASSWORD": "**********",
  "CHECK_TYPE": "CHECK_IN"
}
```

**Response:**

```json
{
  "status_code": 200,
  "message": "Check-in successful",
}
```

For more examples and details, refer to the [API Documentation](#link-to-documentation).

## Error Handling

In case of errors, the API responds with appropriate status codes and error messages. For a list of possible errors and their meanings, see [Error Handling](#link-to-error-handling).

## Contributing

If you would like to contribute to the development of the Attendance Talenta API, please follow our [Contribution Guidelines](CONTRIBUTING.md).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
