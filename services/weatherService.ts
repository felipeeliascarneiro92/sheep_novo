
export interface WeatherForecast {
  condition: 'Ensolarado' | 'Sol entre Nuvens' | 'Nublado' | 'Chuva Leve' | 'Chuva' | 'Tempestade' | 'Neve';
  tempMin: number;
  tempMax: number;
  icon: 'sun' | 'cloud-sun' | 'cloud' | 'cloud-rain' | 'cloud-lightning';
}

// WMO Weather interpretation codes (https://open-meteo.com/en/docs)
const getWeatherCondition = (wmoCode: number): { condition: WeatherForecast['condition'], icon: WeatherForecast['icon'] } => {
    // Clear sky & Mainly Clear
    if (wmoCode === 0 || wmoCode === 1) return { condition: 'Ensolarado', icon: 'sun' };
    
    // Partly cloudy & Fog (Optimistic mapping: Fog usually clears up to sun/clouds)
    // 2: Partly cloudy, 45/48: Fog
    if (wmoCode === 2 || wmoCode === 45 || wmoCode === 48) return { condition: 'Sol entre Nuvens', icon: 'cloud-sun' };
    
    // Overcast
    if (wmoCode === 3) return { condition: 'Nublado', icon: 'cloud' };
    
    // Drizzle
    if ([51, 53, 55, 56, 57].includes(wmoCode)) return { condition: 'Chuva Leve', icon: 'cloud-rain' };
    
    // Rain
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(wmoCode)) return { condition: 'Chuva', icon: 'cloud-rain' };
    
    // Snow
    if ([71, 73, 75, 77, 85, 86].includes(wmoCode)) return { condition: 'Neve', icon: 'cloud' };
    
    // Thunderstorm
    if ([95, 96, 99].includes(wmoCode)) return { condition: 'Tempestade', icon: 'cloud-lightning' };

    return { condition: 'Sol entre Nuvens', icon: 'cloud-sun' };
};

export const getWeatherForecast = async (date: Date, lat?: number, lng?: number): Promise<WeatherForecast | null> => {
  // If no location provided, cannot fetch real weather
  if (!lat || !lng) return null;

  const dateStr = date.toISOString().split('T')[0];
  const today = new Date();
  const diffTime = Math.abs(date.getTime() - today.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Open-Meteo provides forecast for ~14-16 days. If booking is too far, return null or mock average.
  if (diffDays > 14) {
      return null; 
  }

  try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto&start_date=${dateStr}&end_date=${dateStr}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Weather API Error');
      
      const data = await response.json();
      
      if (!data.hourly || !data.hourly.weather_code) {
          return null;
      }

      const hourlyCodes = data.hourly.weather_code;
      
      // OPTIMISTIC LOGIC (10:00 to 16:00)
      // We check the typical shooting hours. If there is ANY window of sun, we declare the day as Sunny/Good.
      // This overrides "Morning Fog" or "Afternoon Shower" if the rest of the day is fine.
      const shootingHours = [10, 11, 12, 13, 14, 15, 16];
      
      // Default determination uses the code at 14:00 (Index 14)
      let determinedCode = hourlyCodes[14] !== undefined ? hourlyCodes[14] : 2; 

      // 1. Priority: Full Sun (0, 1)
      const hasSun = shootingHours.some(h => hourlyCodes[h] !== undefined && (hourlyCodes[h] === 0 || hourlyCodes[h] === 1));
      
      if (hasSun) {
          determinedCode = 0; // Force 'Ensolarado'
      } else {
          // 2. Priority: Sun between clouds (includes Fog clearing up)
          const hasPartialSun = shootingHours.some(h => 
              hourlyCodes[h] !== undefined && (hourlyCodes[h] === 2 || hourlyCodes[h] === 45 || hourlyCodes[h] === 48)
          );
          if (hasPartialSun) {
              determinedCode = 2; // Force 'Sol entre Nuvens'
          }
          // Else: Keep the 14:00 forecast (likely Overcast or Rain if above checks failed)
      }

      const min = data.daily.temperature_2m_min[0];
      const max = data.daily.temperature_2m_max[0];
      
      const { condition, icon } = getWeatherCondition(determinedCode);

      return {
          condition,
          tempMin: Math.round(min),
          tempMax: Math.round(max),
          icon
      };

  } catch (error) {
      console.error("Error fetching weather:", error);
      return null;
  }
};
