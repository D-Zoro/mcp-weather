"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WeatherService = void 0;
const axios_1 = __importDefault(require("axios"));
class WeatherService {
    apiKey;
    baseUrl = 'https://api.openweathermap.org/data/2.5';
    constructor(apiKey) {
        this.apiKey = apiKey;
    }
    async getCurrentWeather(location) {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/weather`, {
                params: {
                    q: location,
                    appid: this.apiKey,
                    units: 'metric' // Use Celsius
                }
            });
            const data = response.data;
            return {
                location: data.name,
                temperature: Math.round(data.main.temp),
                feels_like: Math.round(data.main.feels_like),
                humidity: data.main.humidity,
                description: data.weather[0].description,
                wind_speed: data.wind.speed,
                wind_direction: data.wind.deg,
                visibility: data.visibility / 1000, // Convert to km
                pressure: data.main.pressure,
                timestamp: new Date(data.dt * 1000).toISOString()
            };
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                throw new Error(`Weather API error: ${error.response?.data?.message || error.message}`);
            }
            throw new Error(`Failed to fetch weather data: ${error}`);
        }
    }
    async getForecast(location, days = 5) {
        try {
            // OpenWeatherMap free tier provides 5-day forecast
            const response = await axios_1.default.get(`${this.baseUrl}/forecast`, {
                params: {
                    q: location,
                    appid: this.apiKey,
                    units: 'metric'
                }
            });
            const data = response.data;
            // Group forecast data by day (API returns 3-hour intervals)
            const dailyForecasts = new Map();
            data.list.forEach(item => {
                const date = new Date(item.dt * 1000).toDateString();
                if (!dailyForecasts.has(date)) {
                    dailyForecasts.set(date, {
                        date: new Date(item.dt * 1000).toISOString().split('T')[0],
                        temp_max: item.main.temp_max,
                        temp_min: item.main.temp_min,
                        description: item.weather[0].description,
                        humidity: item.main.humidity,
                        wind_speed: item.wind.speed,
                        precipitation_chance: Math.round(item.pop * 100)
                    });
                }
                else {
                    // Update max/min temperatures
                    const existing = dailyForecasts.get(date);
                    existing.temp_max = Math.max(existing.temp_max, item.main.temp_max);
                    existing.temp_min = Math.min(existing.temp_min, item.main.temp_min);
                }
            });
            const forecast = Array.from(dailyForecasts.values())
                .slice(0, Math.min(days, 5))
                .map(day => ({
                date: day.date,
                temperature_max: Math.round(day.temp_max),
                temperature_min: Math.round(day.temp_min),
                description: day.description,
                humidity: day.humidity,
                wind_speed: day.wind_speed,
                precipitation_chance: day.precipitation_chance
            }));
            return {
                location: data.city.name,
                forecast
            };
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                throw new Error(`Forecast API error: ${error.response?.data?.message || error.message}`);
            }
            throw new Error(`Failed to fetch forecast data: ${error}`);
        }
    }
    async getWeatherAlerts(location) {
        // Note: Weather alerts require the One Call API which needs a paid subscription
        // For this demo, we'll return a simple message
        return `Weather alerts feature requires OpenWeatherMap One Call API subscription. Current location: ${location}`;
    }
}
exports.WeatherService = WeatherService;
//# sourceMappingURL=weatherService.js.map