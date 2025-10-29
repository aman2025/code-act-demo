/**
 * Mock Services - Simulated external services for testing and demonstration
 * Includes WeatherService and FlightService with realistic mock responses
 */

import BaseTool from '../core/baseTool.js';

/**
 * Mock Weather Service Tool
 */
class WeatherService extends BaseTool {
  constructor() {
    super(
      'weather-service',
      'Provides simulated weather information for specified locations',
      'external'
    );

    this.setupParameters();
    this.setupExamples();
    this.setupMockData();
  }

  /**
   * Setup tool parameters
   */
  setupParameters() {
    this.addParameter(
      'location',
      'string',
      true,
      'Location name (city, state/country) to get weather for'
    );

    this.addParameter(
      'units',
      'string',
      false,
      'Temperature units (celsius, fahrenheit, kelvin)',
      'celsius'
    );

    this.addParameter(
      'include_forecast',
      'boolean',
      false,
      'Whether to include 3-day forecast',
      false
    );
  }

  /**
   * Setup usage examples
   */
  setupExamples() {
    this.addExample(
      'Get current weather for New York',
      { location: 'New York, NY' },
      { 
        location: 'New York, NY',
        temperature: 22,
        condition: 'Partly Cloudy',
        humidity: 65
      }
    );

    this.addExample(
      'Get weather with forecast for London',
      { location: 'London, UK', include_forecast: true },
      {
        location: 'London, UK',
        temperature: 18,
        condition: 'Rainy',
        forecast: []
      }
    );
  }

  /**
   * Setup mock weather data
   */
  setupMockData() {
    this.mockWeatherData = {
      'new york': {
        temperature: { celsius: 22, fahrenheit: 72, kelvin: 295 },
        condition: 'Partly Cloudy',
        humidity: 65,
        windSpeed: 12,
        pressure: 1013,
        visibility: 10
      },
      'london': {
        temperature: { celsius: 18, fahrenheit: 64, kelvin: 291 },
        condition: 'Rainy',
        humidity: 80,
        windSpeed: 8,
        pressure: 1008,
        visibility: 6
      },
      'tokyo': {
        temperature: { celsius: 25, fahrenheit: 77, kelvin: 298 },
        condition: 'Sunny',
        humidity: 55,
        windSpeed: 5,
        pressure: 1020,
        visibility: 15
      },
      'sydney': {
        temperature: { celsius: 20, fahrenheit: 68, kelvin: 293 },
        condition: 'Cloudy',
        humidity: 70,
        windSpeed: 15,
        pressure: 1015,
        visibility: 12
      },
      'paris': {
        temperature: { celsius: 16, fahrenheit: 61, kelvin: 289 },
        condition: 'Overcast',
        humidity: 75,
        windSpeed: 10,
        pressure: 1010,
        visibility: 8
      }
    };

    this.conditions = ['Sunny', 'Partly Cloudy', 'Cloudy', 'Overcast', 'Rainy', 'Stormy', 'Snowy'];
  }

  /**
   * Execute weather lookup
   * @param {Object} params - Weather parameters
   * @returns {Promise<ToolResult>} - Weather result
   */
  async execute(params) {
    try {
      const preparedParams = this.prepareParameters(params);
      const { location, units, include_forecast } = preparedParams;

      // Simulate API delay
      await this.simulateDelay(200, 800);

      // Normalize location for lookup
      const normalizedLocation = location.toLowerCase().split(',')[0].trim();
      
      // Get weather data (mock or generated)
      const weatherData = this.getWeatherData(normalizedLocation, units);
      
      const result = {
        location: location,
        temperature: weatherData.temperature,
        condition: weatherData.condition,
        humidity: weatherData.humidity,
        windSpeed: weatherData.windSpeed,
        pressure: weatherData.pressure,
        visibility: weatherData.visibility,
        units: units,
        timestamp: new Date().toISOString(),
        source: 'Mock Weather Service'
      };

      // Add forecast if requested
      if (include_forecast) {
        result.forecast = this.generateForecast(weatherData, units);
      }

      return this.createSuccessResult(
        result,
        `Successfully retrieved weather data for ${location}`
      );

    } catch (error) {
      return this.createErrorResult(
        `Weather service failed: ${error.message}`,
        error
      );
    }
  }

  /**
   * Get weather data for location
   * @param {string} location - Normalized location
   * @param {string} units - Temperature units
   * @returns {Object} - Weather data
   */
  getWeatherData(location, units) {
    // Check if we have mock data for this location
    if (this.mockWeatherData[location]) {
      const data = this.mockWeatherData[location];
      return {
        temperature: data.temperature[units] || data.temperature.celsius,
        condition: data.condition,
        humidity: data.humidity,
        windSpeed: data.windSpeed,
        pressure: data.pressure,
        visibility: data.visibility
      };
    }

    // Generate random weather data for unknown locations
    return this.generateRandomWeather(units);
  }

  /**
   * Generate random weather data
   * @param {string} units - Temperature units
   * @returns {Object} - Random weather data
   */
  generateRandomWeather(units) {
    const baseTemp = Math.floor(Math.random() * 30) + 5; // 5-35°C
    const condition = this.conditions[Math.floor(Math.random() * this.conditions.length)];
    
    let temperature;
    switch (units) {
      case 'fahrenheit':
        temperature = Math.round((baseTemp * 9/5) + 32);
        break;
      case 'kelvin':
        temperature = Math.round(baseTemp + 273.15);
        break;
      default:
        temperature = baseTemp;
    }

    return {
      temperature,
      condition,
      humidity: Math.floor(Math.random() * 40) + 40, // 40-80%
      windSpeed: Math.floor(Math.random() * 20) + 2, // 2-22 km/h
      pressure: Math.floor(Math.random() * 30) + 1000, // 1000-1030 hPa
      visibility: Math.floor(Math.random() * 10) + 5 // 5-15 km
    };
  }

  /**
   * Generate 3-day forecast
   * @param {Object} currentWeather - Current weather data
   * @param {string} units - Temperature units
   * @returns {Array} - Forecast array
   */
  generateForecast(currentWeather, units) {
    const forecast = [];
    
    for (let i = 1; i <= 3; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      
      // Vary temperature slightly from current
      const tempVariation = (Math.random() - 0.5) * 10;
      const forecastTemp = Math.round(currentWeather.temperature + tempVariation);
      
      forecast.push({
        date: date.toISOString().split('T')[0],
        temperature: {
          high: forecastTemp + Math.floor(Math.random() * 5),
          low: forecastTemp - Math.floor(Math.random() * 5)
        },
        condition: this.conditions[Math.floor(Math.random() * this.conditions.length)],
        humidity: Math.floor(Math.random() * 40) + 40
      });
    }
    
    return forecast;
  }

  /**
   * Simulate API delay
   * @param {number} min - Minimum delay in ms
   * @param {number} max - Maximum delay in ms
   */
  async simulateDelay(min = 100, max = 500) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}

/**
 * Mock Flight Service Tool
 */
class FlightService extends BaseTool {
  constructor() {
    super(
      'flight-service',
      'Provides simulated flight search results for specified routes and dates',
      'external'
    );

    this.setupParameters();
    this.setupExamples();
    this.setupMockData();
  }

  /**
   * Setup tool parameters
   */
  setupParameters() {
    this.addParameter(
      'from',
      'string',
      true,
      'Departure airport code or city name'
    );

    this.addParameter(
      'to',
      'string',
      true,
      'Destination airport code or city name'
    );

    this.addParameter(
      'date',
      'string',
      true,
      'Departure date (YYYY-MM-DD format)'
    );

    this.addParameter(
      'return_date',
      'string',
      false,
      'Return date for round trip (YYYY-MM-DD format)'
    );

    this.addParameter(
      'passengers',
      'number',
      false,
      'Number of passengers',
      1
    );

    this.addParameter(
      'class',
      'string',
      false,
      'Travel class (economy, business, first)',
      'economy'
    );
  }

  /**
   * Setup usage examples
   */
  setupExamples() {
    this.addExample(
      'Search flights from NYC to LAX',
      { from: 'NYC', to: 'LAX', date: '2024-12-15' },
      {
        route: 'NYC → LAX',
        flights: [],
        searchDate: '2024-12-15'
      }
    );

    this.addExample(
      'Search round trip flights',
      { from: 'LHR', to: 'CDG', date: '2024-12-20', return_date: '2024-12-27' },
      {
        route: 'LHR ⇄ CDG',
        outbound: [],
        return: []
      }
    );
  }

  /**
   * Setup mock flight data
   */
  setupMockData() {
    this.airlines = [
      'American Airlines', 'Delta Air Lines', 'United Airlines', 'Southwest Airlines',
      'British Airways', 'Lufthansa', 'Air France', 'Emirates', 'Singapore Airlines'
    ];

    this.aircraftTypes = [
      'Boeing 737', 'Boeing 777', 'Boeing 787', 'Airbus A320', 'Airbus A330', 'Airbus A380'
    ];

    this.airports = {
      'nyc': { code: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York' },
      'lax': { code: 'LAX', name: 'Los Angeles International Airport', city: 'Los Angeles' },
      'lhr': { code: 'LHR', name: 'London Heathrow Airport', city: 'London' },
      'cdg': { code: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris' },
      'nrt': { code: 'NRT', name: 'Narita International Airport', city: 'Tokyo' },
      'syd': { code: 'SYD', name: 'Sydney Kingsford Smith Airport', city: 'Sydney' }
    };
  }

  /**
   * Execute flight search
   * @param {Object} params - Flight search parameters
   * @returns {Promise<ToolResult>} - Flight search result
   */
  async execute(params) {
    try {
      const preparedParams = this.prepareParameters(params);
      const { from, to, date, return_date, passengers, class: travelClass } = preparedParams;

      // Simulate API delay
      await this.simulateDelay(500, 1500);

      // Validate date format
      if (!this.isValidDate(date)) {
        return this.createErrorResult('Invalid departure date format. Use YYYY-MM-DD');
      }

      if (return_date && !this.isValidDate(return_date)) {
        return this.createErrorResult('Invalid return date format. Use YYYY-MM-DD');
      }

      // Normalize airport codes
      const fromAirport = this.normalizeAirport(from);
      const toAirport = this.normalizeAirport(to);

      // Generate flight results
      const outboundFlights = this.generateFlights(fromAirport, toAirport, date, travelClass, passengers);
      
      const result = {
        route: `${fromAirport.code} → ${toAirport.code}`,
        from: fromAirport,
        to: toAirport,
        departureDate: date,
        passengers: passengers,
        class: travelClass,
        flights: outboundFlights,
        searchTimestamp: new Date().toISOString(),
        source: 'Mock Flight Service'
      };

      // Add return flights if round trip
      if (return_date) {
        const returnFlights = this.generateFlights(toAirport, fromAirport, return_date, travelClass, passengers);
        result.returnDate = return_date;
        result.returnFlights = returnFlights;
        result.route = `${fromAirport.code} ⇄ ${toAirport.code}`;
        result.tripType = 'round-trip';
      } else {
        result.tripType = 'one-way';
      }

      return this.createSuccessResult(
        result,
        `Found ${outboundFlights.length} flights for ${result.route} on ${date}`
      );

    } catch (error) {
      return this.createErrorResult(
        `Flight search failed: ${error.message}`,
        error
      );
    }
  }

  /**
   * Generate mock flights
   * @param {Object} from - Departure airport
   * @param {Object} to - Destination airport
   * @param {string} date - Flight date
   * @param {string} travelClass - Travel class
   * @param {number} passengers - Number of passengers
   * @returns {Array} - Array of flight options
   */
  generateFlights(from, to, date, travelClass, passengers) {
    const flights = [];
    const flightCount = Math.floor(Math.random() * 5) + 3; // 3-7 flights

    for (let i = 0; i < flightCount; i++) {
      const departure = this.generateTime();
      const duration = this.calculateFlightDuration(from.code, to.code);
      const arrival = this.addMinutesToTime(departure, duration);
      
      const basePrice = this.calculateBasePrice(from.code, to.code, travelClass);
      const priceVariation = (Math.random() - 0.5) * 200;
      const price = Math.round(basePrice + priceVariation);

      flights.push({
        flightNumber: this.generateFlightNumber(),
        airline: this.airlines[Math.floor(Math.random() * this.airlines.length)],
        aircraft: this.aircraftTypes[Math.floor(Math.random() * this.aircraftTypes.length)],
        departure: {
          time: departure,
          airport: from.code,
          terminal: Math.floor(Math.random() * 4) + 1
        },
        arrival: {
          time: arrival,
          airport: to.code,
          terminal: Math.floor(Math.random() * 4) + 1
        },
        duration: `${Math.floor(duration / 60)}h ${duration % 60}m`,
        price: {
          amount: price * passengers,
          currency: 'USD',
          perPerson: price
        },
        class: travelClass,
        stops: Math.random() > 0.7 ? 1 : 0, // 30% chance of 1 stop
        availableSeats: Math.floor(Math.random() * 50) + 10
      });
    }

    // Sort by price
    return flights.sort((a, b) => a.price.amount - b.price.amount);
  }

  /**
   * Normalize airport input to airport object
   * @param {string} input - Airport code or city name
   * @returns {Object} - Airport object
   */
  normalizeAirport(input) {
    const normalized = input.toLowerCase().trim();
    
    // Check if it's a known airport code or city
    if (this.airports[normalized]) {
      return this.airports[normalized];
    }

    // Check if it's already an airport code
    for (const airport of Object.values(this.airports)) {
      if (airport.code.toLowerCase() === normalized) {
        return airport;
      }
    }

    // Generate a mock airport for unknown inputs
    return {
      code: input.toUpperCase().substring(0, 3),
      name: `${input} Airport`,
      city: input
    };
  }

  /**
   * Generate random flight time
   * @returns {string} - Time in HH:MM format
   */
  generateTime() {
    const hour = Math.floor(Math.random() * 24);
    const minute = Math.floor(Math.random() * 4) * 15; // 0, 15, 30, 45
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }

  /**
   * Calculate flight duration based on route
   * @param {string} from - Departure airport code
   * @param {string} to - Destination airport code
   * @returns {number} - Duration in minutes
   */
  calculateFlightDuration(from, to) {
    // Mock duration calculation based on common routes
    const routeDurations = {
      'JFK-LAX': 360, 'LAX-JFK': 300,
      'LHR-CDG': 80, 'CDG-LHR': 80,
      'JFK-LHR': 420, 'LHR-JFK': 480,
      'LAX-NRT': 660, 'NRT-LAX': 600
    };

    const route = `${from}-${to}`;
    if (routeDurations[route]) {
      return routeDurations[route] + (Math.random() - 0.5) * 60; // ±30 min variation
    }

    // Default duration for unknown routes
    return Math.floor(Math.random() * 480) + 120; // 2-10 hours
  }

  /**
   * Add minutes to time string
   * @param {string} time - Time in HH:MM format
   * @param {number} minutes - Minutes to add
   * @returns {string} - New time in HH:MM format
   */
  addMinutesToTime(time, minutes) {
    const [hours, mins] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  }

  /**
   * Calculate base price for route and class
   * @param {string} from - Departure airport
   * @param {string} to - Destination airport
   * @param {string} travelClass - Travel class
   * @returns {number} - Base price in USD
   */
  calculateBasePrice(from, to, travelClass) {
    let basePrice = 200; // Base domestic price

    // International routes cost more
    const internationalRoutes = ['JFK-LHR', 'LAX-NRT', 'LHR-CDG'];
    if (internationalRoutes.some(route => route.includes(from) && route.includes(to))) {
      basePrice = 600;
    }

    // Class multipliers
    const classMultipliers = {
      economy: 1,
      business: 3,
      first: 6
    };

    return basePrice * (classMultipliers[travelClass] || 1);
  }

  /**
   * Generate flight number
   * @returns {string} - Flight number
   */
  generateFlightNumber() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const airline = letters[Math.floor(Math.random() * letters.length)] + 
                   letters[Math.floor(Math.random() * letters.length)];
    const number = Math.floor(Math.random() * 9000) + 1000;
    return `${airline}${number}`;
  }

  /**
   * Validate date format
   * @param {string} date - Date string
   * @returns {boolean} - Whether date is valid
   */
  isValidDate(date) {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(date)) return false;
    
    const dateObj = new Date(date);
    return dateObj instanceof Date && !isNaN(dateObj);
  }

  /**
   * Simulate API delay
   * @param {number} min - Minimum delay in ms
   * @param {number} max - Maximum delay in ms
   */
  async simulateDelay(min = 100, max = 500) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}

export { WeatherService, FlightService };