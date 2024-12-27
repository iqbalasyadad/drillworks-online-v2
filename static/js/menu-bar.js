$(document).ready(function() {
    // // Handle dialog opening for creating project
    // $(".create-project").click(function() {
    //     $("#createProjectDialog").dialog({
    //         modal: true,
    //         buttons: {
    //             "Create": function() {
    //                 // Send API request to create a project
    //                 $.ajax({
    //                     url: "/create_project",
    //                     method: "POST",
    //                     data: {
    //                         // Form data for project creation
    //                     },
    //                     success: function(response) {
    //                         alert("Project created successfully");
    //                     }
    //                 });
    //                 $(this).dialog("close");
    //             },
    //             "Cancel": function() {
    //                 $(this).dialog("close");
    //             }
    //         }
    //     });
    // });

    // // Handle dialog opening for opening project
    // $(".open-project").click(function() {
    //     $("#openProjectDialog").dialog({
    //         modal: true,
    //         buttons: {
    //             "Open": function() {
    //                 // Send API request to open a project
    //                 $.ajax({
    //                     url: "/open_project",
    //                     method: "GET",
    //                     success: function(response) {
    //                         alert("Project opened successfully");
    //                     }
    //                 });
    //                 $(this).dialog("close");
    //             },
    //             "Cancel": function() {
    //                 $(this).dialog("close");
    //             }
    //         }
    //     });
    // });

    // // Handle dialog opening for deleting project
    // $(".delete-project").click(function() {
    //     $("#deleteProjectDialog").dialog({
    //         modal: true,
    //         buttons: {
    //             "Delete": function() {
    //                 // Send API request to delete a project
    //                 $.ajax({
    //                     url: "/delete_project",
    //                     method: "POST",
    //                     data: {
    //                         projectId: "project_id" // Replace with selected project ID
    //                     },
    //                     success: function(response) {
    //                         alert("Project deleted successfully");
    //                     }
    //                 });
    //                 $(this).dialog("close");
    //             },
    //             "Cancel": function() {
    //                 $(this).dialog("close");
    //             }
    //         }
    //     });
    // });

    // Handle logout
    $("#menubar-logout").click(function() {
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
    });
});
