$(document).ready(function () {
  console.log(config.apiUrl);

  const getProjects = async () => {
      try {
          const response = await axios.get(`${config.apiUrl}/api/projects`, {
              withCredentials: true, // Include cookies with the request
          });
          return response.data;
      } catch (error) {
          console.error("Error fetching projects:", error.response?.data || error.message);
          throw error;
      }
  };

  const activateProject = async (project) => {
    try {
      const response = await axios.post(`${config.apiUrl}/api/save_selected_project`, {
        project_id: project._id,
        project_name: project.name
      }, {
        withCredentials: true,  // Include cookies with the request
      });
      return response;
    } catch (error) {
      console.error("Error saving project:", error.response?.data || error.message);
      throw error;
    }
  };

  const checkSession = async () => {
    try {
        const response = await axios.get(`${config.apiUrl}/check-session`, {
            withCredentials: true, // Include cookies in the request
        });
        console.log(response.data);
    } catch (error) {
        console.error("Error fetching session:", error.response?.data || error.message);
    }
  };

  // Handle logouts
  function logoutAccount() {
    $.ajax({
        url: "/logout",
        method: "GET",
        success: function(response) {
            window.location.href = "/login"; // Redirect to login page
        },
        error: function() {
            alert("Error logging out.");
        }
    });
  };



  // Attach functions to window if needed for global access
  window.getProjects = getProjects;
  window.activateProject = activateProject;

  window.checkSession = checkSession;
  window.logoutAccount = logoutAccount;


});
