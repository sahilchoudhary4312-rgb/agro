import math


def haversine_km(lat1: float | None, lon1: float | None, lat2: float | None, lon2: float | None) -> float | None:
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return None
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return round(2 * r * math.asin(math.sqrt(a)), 1)


def road_distance_km(lat1, lon1, lat2, lon2) -> float | None:
    straight = haversine_km(lat1, lon1, lat2, lon2)
    if straight is None:
        return None
    return round(straight * 1.25, 1)  # road factor approximation
