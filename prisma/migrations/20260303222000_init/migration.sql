-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT,
    "dateISO" TEXT,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "createdAtISO" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "Event_createdAtISO_idx" ON "Event"("createdAtISO");

-- CreateIndex
CREATE INDEX "Event_lat_lng_idx" ON "Event"("lat", "lng");
