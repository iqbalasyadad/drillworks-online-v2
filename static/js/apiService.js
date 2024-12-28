$(document).ready(function () {
  console.log(config.apiUrl);

  function refreshUI() {
    console.log("UI refreshed");
    setAppHeader();
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

  const setActiveProject = async (project) => {
    console.log("setActiveProject called");
    try {
      const response = await axios.post(`${config.apiUrl}/api/set-active-project`, {
        _id: project._id,
        name: project.name
      }, {
        withCredentials: true,  // Include cookies with the request
      });
      localStorage.setItem('activeProject', JSON.stringify({
        _id: project._id,
        name: project.name
      }));
      refreshUI();
      
      return response;
    } catch (error) {
      console.error("Error saving project:", error.response?.data || error.message);
      throw error;
    }
  };
  
  const getActiveProject = async() => {
    console.log("call getActiveProject");
    try {
      const response = await axios.get(`${config.apiUrl}/api/get-active-project`, {
        withCredentials: true, // Include cookies with the request
      });
      // console.log(response);
      localStorage.setItem('activeProject', JSON.stringify(response.data));

      return response.data;
    } catch (error) {
        console.error("Error fetching projects:", error.response?.data || error.message);
        throw error;
    }
  };

  function getLocalActiveProject() {
    const activeProject = JSON.parse(localStorage.getItem('activeProject'));
    if (!activeProject) {
      console.log("Failed to retrieve the active project");
      return;
    }
    return activeProject;
  };

  const deleteProject = async (project, deleteWells) => {
    try {
      const response = await fetch(`${config.apiUrl}/api/projects/${project._id}?delete_wells=${deleteWells}`, {
        method: "DELETE", // Set the method to DELETE
        headers: {
          'Content-Type': 'application/json', // Specify content type if you're sending JSON
        },
        credentials: 'include', // This is equivalent to 'withCredentials: true'
        body: JSON.stringify({ project_id: project._id, project_name: project.name }), // If needed in body
      });
  
      if (!response.ok) {
        throw new Error(`Failed to delete project: ${response.statusText}`);
      }
  
      return await response.json(); // Assuming the API responds with JSON data
    } catch (error) {
      console.error("Error:", error);
      throw error;
    }
  };
  
  const getWells = async (projectId) => {
    try {
      const response = await axios.get(`${config.apiUrl}/api/wells?project_id=${projectId}`, {
        withCredentials: true,  // Include cookies with the request
      });
      console.log(response);
      return response.data;
    } catch (error) {
      console.error("Error get wells:", error.response?.data || error.message);
      throw error;
    }
  };

  const addWell = async (formData) => {
    try {
      const response = await fetch(`${config.apiUrl}/api/wells`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
          credentials: "include",
      });

      const result = await response.json();
      if (!response.ok) {
          throw new Error(result.message || "Failed to add well");
      }
      return result;
    } catch (error) {
        console.error("Error:", error);
        alert("An error occurred: " + error.message);
    }
  };

  const deleteWell = async (projectId, wellId) => {
    try {
      const response = await fetch(`${config.apiUrl}/api/wells/${wellId}`, {
        method: "DELETE",
        credentials: "include",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to delete project");
      }
      console.log(result.message);
      return result;
    } catch (error) {
      console.error("Error:", error);
      alert(error.message);
    }
  };





  // Attach functions to window if needed for global access
  window.checkSession = checkSession;
  window.logoutAccount = logoutAccount;
  window.getProjects = getProjects;
  window.setActiveProject = setActiveProject;
  window.getActiveProject = getActiveProject;
  window.getLocalActiveProject = getLocalActiveProject;
  window.deleteProject = deleteProject;


  window.getWells = getWells;
  window.addWell = addWell;
  window.deleteWell = deleteWell;

});
