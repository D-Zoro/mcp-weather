export interface WeatherData {
  location: string;
  temperature: number;
  feels_like: number;
  humidity: number;
  description: string;
  wind_speed: number;
  wind_direction: number;
  visibility: number;
  pressure: number;
  timestamp: string;
}

export interface ForecastDay {
  date: string;
  temperature_max: number;
  temperature_min: number;
  description: string;
  humidity: number;
  wind_speed: number;
  precipitation_chance: number;
}

export interface ForecastData {
  location: string;
  forecast: ForecastDay[];
}

export interface WeatherAlert {
  event: string;
  description: string;
  severity: string;
  start: string;
  end: string;
}


export interface OpenWeatherCurrentResponse {
  name: string;
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
    pressure: number;
  };
  weather: Array<{
    main: string;
    description: string;
  }>;
  wind: {
    speed: number;
    deg: number;
  };
  visibility: number;
  dt: number;
}

export interface OpenWeatherForecastResponse {
  city: {
    name: string;
  };
  list: Array<{
    dt: number;
    main: {
      temp_max: number;
      temp_min: number;
      humidity: number;
    };
    weather: Array<{
      main: string;
      description: string;
    }>;
    wind: {
      speed: number;
    };
    pop: number; 
  }>;
}
