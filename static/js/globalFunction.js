$(document).ready(function () {
    
    function calculateTVD(measuredDepths, inclinations) {
        /**
         * Calculate the True Vertical Depth (TVD) using the minimum radius curvature method.
         *
         * @param {number[]} measuredDepths - Array of measured depths (MD) at each point (in meters).
         * @param {number[]} inclinations - Array of wellbore inclinations at each point (in degrees).
         * @return {number[]} Array of True Vertical Depths (TVD) at each point (in meters), rounded to two decimal points.
         * @throws {Error} If the lengths of measuredDepths and inclinations do not match.
         */
        
        // Check input lengths
        if (measuredDepths.length !== inclinations.length) {
          throw new Error("Measured depths and inclinations lists must have the same length.");
        }
      
        // Convert inclinations to radians
        const inclinationsRad = inclinations.map((inc) => (inc * Math.PI) / 180);
      
        // Initialize TVD list
        const tvd = [0]; // TVD at the surface is 0
        let tvdLast = 0; // Starting with 0 at surface
      
        for (let i = 1; i < measuredDepths.length; i++) {
          // Measured depth difference
          const deltaMD = measuredDepths[i] - measuredDepths[i - 1];
      
          // Current and previous inclinations
          const inc1 = inclinationsRad[i - 1];
          const inc2 = inclinationsRad[i];
      
          // Average inclination for this segment
          const avgInclination = (inc1 + inc2) / 2;
      
          // Calculate the TVD increment using the radius of curvature
          const deltaTVD = deltaMD * Math.cos(avgInclination);
      
          // Update and round the TVD
          tvdLast += deltaTVD;
          tvd.push(Number(tvdLast.toFixed(3))); // Store rounded TVD
        }
      
        return tvd;
    }

    window.calculateTVD = calculateTVD;
      

});