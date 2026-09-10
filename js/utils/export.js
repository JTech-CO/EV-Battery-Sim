export function downloadJson(filename, data) {
  downloadBlob(filename, JSON.stringify(data, null, 2), 'application/json;charset=utf-8');
}

export function downloadResultsCsv(filename, result) {
  const o = result.out;
  const keys = ['timeS','speedMph','requestedPackPowerKW','actualPackPowerKW','packVoltageV','packCurrentA','cellVoltageV','cellCurrentA','cRate','soc','temperatureC','soh','ocvV','xn','xp','generatedHeatWCell','platingRisk','agingStress','powerLimited'];
  const headers = ['time_s','speed_mph','requested_pack_power_kW','actual_pack_power_kW','pack_voltage_V','pack_current_A','cell_voltage_V','cell_current_A','c_rate','soc_fraction','temperature_C','soh_fraction','ocv_V','negative_stoichiometry','positive_stoichiometry','cell_heat_W','plating_risk_index','aging_stress_index','power_limited'];
  const rows = [headers.join(',')];
  for (let i=0;i<o.timeS.length;i++) rows.push(keys.map(k => csvValue(o[k][i])).join(','));
  downloadBlob(filename, rows.join('\n'), 'text/csv;charset=utf-8');
}

function csvValue(v) { return Number.isFinite(v) ? String(v) : ''; }
function downloadBlob(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
