$(document).ready(function () {
    // Load Dashboard Components
    $("#header").load("components/header.html");
    $("#menu").load("components/menu.html");
    $("#quickmenu").load("components/quickmenu.html");
    $("#projectExplorer").load("components/projectExplorer.html", function () {
      initializeProjectExplorer(); // Initialize jsTree
    });
    $("#plot").load("components/plot.html");
  
    // Bind Dialog Actions
    bindDialogs();
  });
  
  function initializeProjectExplorer() {
    // Initialize jsTree or similar logic
    $('#projectTree').jstree({
      core: {
        data: [
          { id: '1', parent: '#', text: 'Project 1' },
          { id: '2', parent: '1', text: 'Well 1' }
        ]
      }
    });
  }
  
  function bindDialogs() {
    // Example: Trigger Create Project Dialog
    $(document).on("click", "#createProject", function () {
      $("#dialogContainer").load("dialogs/createProjectDialog.html", function () {
        $(".dialog").fadeIn();
      });
    });
  }
  