$(document).ready(async function () {
    await getActiveProject();
    setAppHeader();
    initializeTree();
    await initConfig();
});