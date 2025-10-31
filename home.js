<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>POI Taxi - Login</title>

  <style>
    /* RESET */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    html, body {
      height: 100%;
      font-family: "Poppins", sans-serif;
    }

    /* ==== BACKGROUND ==== */
    body {
      background: url("https://github.com/masajie78car-boop/background-") 
        no-repeat center center/cover;
      display: flex;
      justify-content: center;
      align-items: flex-end; /* tombol di bawah */
      flex-direction: column;
      position: relative;
      text-align: center;
      overflow: hidden;
    }

    /* ==== OVERLAY ==== */
    .overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.45);
      z-index: 1;
    }

    /* ==== LOGIN BUTTON ==== */
    .login-btn {
      position: relative;
      z-index: 2;
      margin-bottom: 60px; /* jarak dari bawah */
      background: #007bff;
      color: white;
      padding: 14px 40px;
      font-size: 1.2rem;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
      transition: all 0.3s ease;
      animation: fadeUp 1.8s ease-out;
    }

    .login-btn:hover {
      background: #0056b3;
      transform: scale(1.05);
    }

    /* ==== ANIMATION ==== */
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(40px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* ==== MOBILE ==== */
    @media (max-width: 600px) {
      .login-btn {
        font-size: 1rem;
        padding: 12px 32px;
        margin-bottom: 40px;
      }
    }
  </style>
</head>

<body>
  <div class="overlay"></div>

  <button class="login-btn" onclick="goLogin()">LOGIN</button>

  <script>
    function goLogin() {
      window.location.href = "login.html";
    }
  </script>
</body>
</html>
