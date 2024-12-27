// $(document).ready(function () {
//     let dragging = false;
//     let sidebarWidth = 200;
  
//     // Initialize sidebar width
//     $('#sidebar-container').css('width', `${sidebarWidth}px`);
  
//     // Handle tab switching
//     function openPexpTab(evt, tabName) {
//       console.log("Left sidebar tab clicked");
  
//       // Hide all tab content
//       $('.p-exp-tabcontent').hide();
  
//       // Remove active class from all tab links
//       $('.p-exp-tablinks').removeClass('active');
  
//       // Show the clicked tab and add active class
//       $(`#${tabName}`).show();
//       $(evt.currentTarget).addClass('active');
//     }
  
//     // Attach click handlers to tabs
//     $(".p-exp-tablinks").on("click", function (e) {
//       const tabName = $(this).data("tab");
//       openPexpTab(e, tabName);
//     });
  
//     // Automatically click the default tab on load
//     $('#defaultOpen').trigger('click');
  
//     // Handle sidebar dragging
//     $("#dragbar").on("mousedown", function (e) {
//       e.preventDefault();
//       dragging = true;
//     });
  
//     $(window).on("mousemove", function (e) {
//       if (dragging) {
//         sidebarWidth = e.clientX;
//         $('#sidebar-container').css('width', `${sidebarWidth}px`);
//       }
//     });
  
//     $(window).on("mouseup", function () {
//       dragging = false;
//     });

//   });
  