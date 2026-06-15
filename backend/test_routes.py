from app.routers.admissions import router

print("\n=== ADMISSIONS ROUTES ===\n")
for route in router.routes:
    print(f"Path: {route.path}")
    print(f"Methods: {route.methods}")
    print(f"Endpoint: {route.endpoint.__name__ if hasattr(route, 'endpoint') else 'N/A'}")
    print("-" * 60)
