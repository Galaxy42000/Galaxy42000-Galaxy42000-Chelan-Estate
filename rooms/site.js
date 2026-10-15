// Which way the plans face. The floor plan (A1.0) is drawn with the garage door at the top
// and the deck at the bottom. The site plan on the cover sheet (C1.0), which is drawn with
// north up, shows the building turned so the deck side faces
// west-southwest and the garage door east-northeast: the top of the floor plan points to a
// bearing of about 63°. ⚠ The site plan marks this "approx. bldg location"; adjust here.
//
// The config files keep describing things in plan directions (north = top of the
// drawing). Everything the viewer shows (wall names, notes, the compass) is turned into
// true directions using this; wall names snap to the nearest of N/E/S/W (the deck side
// is called west, the garage-door side east).
export default {
  planNorthBearing: 63,
};
