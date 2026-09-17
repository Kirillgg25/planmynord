# TripPlanner PostGIS setup

PostGIS is optional. The site keeps using SQLite for users, sessions, payments, and saved routes.
PostGIS is only used as a geo cache for map data such as traffic lights and trees.

## Local setup

1. Start PostGIS:

```bash
docker compose up -d postgis
```

2. Add this to `.env`:

```env
POSTGIS_DATABASE_URL=postgres://tripplanner:tripplanner_dev_password@localhost:5432/tripplanner_geo
POSTGIS_CACHE_TTL_HOURS=168
POSTGIS_POOL_SIZE=4
POSTGIS_SSL=false
```

3. Restart the Node server:

```bash
npm start
```

4. Check the connection:

```bash
curl http://localhost:3000/api/geo/status
```

Expected result:

```json
{
  "postgis": {
    "configured": true,
    "connected": true,
    "cacheTtlHours": 168,
    "fallback": false,
    "error": ""
  }
}
```

## How it works

The first request for traffic lights or trees still goes to OpenStreetMap Overpass.
After that, TripPlanner stores the points in PostGIS and marks the requested map area as cached.
Repeated requests for the same area are served from PostGIS.

If PostGIS is not configured or is temporarily unavailable, the app automatically falls back to Overpass.

## Hosted setup

For a hosted PostgreSQL provider, create a database with PostGIS support and set:

```env
POSTGIS_DATABASE_URL=your_hosted_postgres_url
POSTGIS_SSL=true
```

Use `POSTGIS_SSL=false` only for local Docker or providers that do not require SSL.
