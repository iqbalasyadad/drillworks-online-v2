$(document).ready(function () {
  $("#login-form").on("submit", function (e) {
      // e.preventDefault();

      const username = $("#username-input").val();
      const password = $("#password-input").val();

      console.log(username, password);

      const credentials = { username, password };

      $.ajax({
          url: "http://127.0.0.1:5000/login",
          method: "POST",
          contentType: "application/json",
          data: JSON.stringify(credentials),
          xhrFields: {
              withCredentials: true, // Ensure cookies are sent with the request
          },
          success: function (result) {
              // Redirect to the dashboard on success
              window.location.href = "/dashboard";
          },
          error: function (xhr) {
              // Display the error message
              const errorMessage = xhr.responseJSON?.message || "Login failed";
              $("#error-message").text(errorMessage).show();
          },
      });
  });
});