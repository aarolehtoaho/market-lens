async function getHomeData() {
    const response = await fetch("/api/home");
    if (!response.ok) {
        throw new Error(`Home data request failed with status ${response.status}`);
    }
    return response.json();
}