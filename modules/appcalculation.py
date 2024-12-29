import math

def calculate_tvd(measured_depths, inclinations):
    """
    Calculate the True Vertical Depth (TVD) using the minimum radius curvature method.
    
    :param measured_depths: List of measured depths (MD) at each point (in meters).
    :param inclinations: List of wellbore inclinations at each point (in degrees).
    :return: List of True Vertical Depths (TVD) at each point (in meters), rounded to two decimal points.
    :raises ValueError: If the lengths of measured_depths and inclinations do not match.
    """
    # Check input lengths
    if len(measured_depths) != len(inclinations):
        raise ValueError("Measured depths and inclinations lists must have the same length.")
    
    # Convert inclinations to radians
    inclinations_rad = [math.radians(inc) for inc in inclinations]
    
    # Initialize TVD list
    tvd = [0]  # TVD at the surface is 0
    tvd_last = 0  # Starting with 0 at surface

    for i in range(1, len(measured_depths)):
        # Measured depth difference
        delta_md = measured_depths[i] - measured_depths[i-1]
        
        # Current and previous inclinations
        inc_1 = inclinations_rad[i-1]
        inc_2 = inclinations_rad[i]
        
        # Average inclination for this segment
        avg_inclination = (inc_1 + inc_2) / 2
        
        # Calculate the TVD increment using the radius of curvature
        delta_tvd = delta_md * math.cos(avg_inclination)
        
        # Update and round the TVD
        tvd_last += delta_tvd
        tvd.append(round(tvd_last, 2))  # Store rounded TVD

    return tvd
