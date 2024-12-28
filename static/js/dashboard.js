$(document).ready(function () {
  const activeProject = JSON.parse(localStorage.getItem('activeProject'));
  const projectName = activeProject?.name || 'Default Project Name';  // Fallback if project name is not in localStorage

  // Set the text of the <p> tag in the #app-header element
  $('#app-header p').text(projectName);
});