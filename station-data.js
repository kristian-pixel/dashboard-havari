// DSRS station positions used for route animation and station markers on the map.
// Addresses are taken from DSRS' public station page: https://www.dsrs.dk/stationer
// Coordinates are practical harbour/station coordinates based on those addresses.
window.DSRSStations = (() => {
  const stations = {
    'DSRS Helsingør': { name:'DSRS Helsingør', address:'Nordhavnsvej 6, 3000 Helsingør', lat:56.0429, lon:12.6138, icon:'🏠' },
    'DSRS Bregnør': { name:'DSRS Bregnør', address:'Havnevejen 200, 5300 Kerteminde', lat:55.5145, lon:10.6590, icon:'🏠' },
    'DSRS Lynæs': { name:'DSRS Lynæs', address:'Lynæs Havnevej 3 A, 3390 Hundested', lat:55.9437, lon:11.8589, icon:'🏠' },
    'DSRS Rudkøbing': { name:'DSRS Rudkøbing', address:'Havnepladsen 39, 5900 Rudkøbing', lat:54.9389, lon:10.7137, icon:'🏠' },
    'DSRS Juelsminde': { name:'DSRS Juelsminde', address:'Havnegade 15, 7130 Juelsminde', lat:55.7084, lon:10.0170, icon:'🏠' },
    'DSRS København': { name:'DSRS København', address:'Refshalevej 200, 1432 København', lat:55.6950, lon:12.6135, icon:'🏠' },
    'DSRS Løgstør': { name:'DSRS Løgstør', address:'Kanalvejen 4, 9670 Løgstør', lat:56.9660, lon:9.2520, icon:'🏠' },
    'DSRS Vordingborg': { name:'DSRS Vordingborg', address:'Sydhavnsvej 50, 4760 Vordingborg', lat:55.0068, lon:11.9086, icon:'🏠' },
    'DSRS Køge': { name:'DSRS Køge', address:'Bådehavnen 20, 4600 Køge', lat:55.4567, lon:12.1931, icon:'🏠' },
    'DSRS Kerteminde': { name:'DSRS Kerteminde', address:'Marinavej 4, 5300 Kerteminde', lat:55.4510, lon:10.6610, icon:'🏠' },
    'DSRS Assens-Lillebælt': { name:'DSRS Assens-Lillebælt', address:'Næsvej 25, 5610 Assens', lat:55.2707, lon:9.8935, icon:'🏠' },
    'DSRS Faaborg': { name:'DSRS Faaborg', address:'Kanalvejen 15, 5600 Faaborg', lat:55.0964, lon:10.2415, icon:'🏠' },
    'DSRS Struer': { name:'DSRS Struer', address:'Ved Fjorden 14, 7600 Struer', lat:56.4931, lon:8.5945, icon:'🏠' },
    'DSRS Faxe Ladeplads': { name:'DSRS Faxe Ladeplads', address:'Strandvejen 1, 4654 Faxe Ladeplads', lat:55.2194, lon:12.1686, icon:'🏠' },
    // Historical station in the log data. The ghost is deliberate. Kristian demanded it. Sensible governance, slightly haunted harbour.
    'DSRS Årø Havn': { name:'DSRS Årø Havn', address:'Årø Havn (historisk station)', lat:55.2630, lon:9.7180, icon:'👻' },
    'Aktuelt Årø Havn': { name:'DSRS Årø Havn', address:'Årø Havn (historisk station)', lat:55.2630, lon:9.7180, icon:'👻' },
  };
  function lookup(name){
    if(!name) return null;
    if(stations[name]) return stations[name];
    const normalized = String(name).trim().toLowerCase();
    return Object.values(stations).find(s => s.name.toLowerCase() === normalized) || null;
  }
  function all(){ return Object.values(stations).filter((s, i, arr) => arr.findIndex(x => x.name === s.name) === i); }
  return { stations, lookup, all };
})();
