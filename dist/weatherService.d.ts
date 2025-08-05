import { WeatherData, ForecastData } from './types.js';
export declare class WeatherService {
    private apiKey;
    private baseUrl;
    constructor(apiKey: string);
    getCurrentWeather(location: string): Promise<WeatherData>;
    getForecast(location: string, days?: number): Promise<ForecastData>;
    getWeatherAlerts(location: string): Promise<string>;
}
//# sourceMappingURL=weatherService.d.ts.map