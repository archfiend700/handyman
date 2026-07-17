/* ==========================================================================
   Everyday Expert Assistant
   Vanilla JS, no build step. Structure:
     1. DATA        — all knowledge content as plain objects/arrays
     2. Store        — localStorage wrapper
     3. Diagnostic engine — shared by Troubleshooting + Car Assistant
     4. View renderers — one function per tab
     5. Router + init
   To add content: extend DATA. To add a view: add a TABS entry + render fn.
   ========================================================================== */

(function () {
  'use strict';

  
  const CONFIG = {
    supportUrl: 'https://ko-fi.com/guardora', 
    supportPlatform: 'Ko-fi'
  };

  /* ======================================================================
     1. DATA
     ====================================================================== */

  const DATA = {};

  /* ---- Troubleshooting Assistant ---------------------------------------- */
  DATA.troubleshoot = {
    categories: [
      { id: 'electricity', label: 'Electricity', icon: '⚡' },
      { id: 'plumbing',    label: 'Plumbing',    icon: '🚿' },
      { id: 'homerepair',  label: 'Home Repair', icon: '🛠' },
      { id: 'appliances',  label: 'Appliances',  icon: '🧊' },
      { id: 'car',         label: 'Car Problems',icon: '🚗' },
      { id: 'gardening',   label: 'Gardening',   icon: '🌱' },
      { id: 'tools',       label: 'Tools',       icon: '🔧' },
      { id: 'general',     label: 'General Knowledge', icon: '📘' }
    ],
    // problems per category (car redirects to the Car Assistant tab)
    problems: {
      electricity: ['lights_stopped', 'outlet_dead'],
      plumbing:    ['faucet_drip', 'drain_slow'],
      homerepair:  ['wall_crack', 'door_sticking'],
      appliances:  ['fridge_warm', 'washer_noleak'],
      gardening:   ['plant_yellow', 'lawn_patches'],
      tools:       ['drill_weak', 'stuck_screw'],
      general:     ['musty_smell', 'squeaky_floor']
    },
    trees: {
      lights_stopped: {
        title: "My lights stopped working", category: 'electricity', start: 'q1',
        nodes: {
          q1: { q: 'Do other rooms have electricity?', a: [{ l: 'Yes', n: 'q2' }, { l: 'No', n: 'r_outage' }] },
          q2: { q: 'Did a breaker trip (switch sitting in the middle, or off)?', a: [{ l: 'Yes', n: 'r_breaker' }, { l: 'No', n: 'q3' }] },
          q3: { q: 'Any burning smell near the switch or panel?', a: [{ l: 'Yes', n: 'r_burning' }, { l: 'No', n: 'r_bulb' }] },
          r_outage: { causes: ['Neighborhood or building-wide power outage', 'Main breaker or utility feed issue'], difficulty: 'beginner', safety: 'ok', warning: 'Check if neighbors also lost power before assuming a wiring fault.', next: 'Check your utility provider\'s outage map. If neighbors have power and you don\'t, call an electrician to check your main service.' },
          r_breaker: { causes: ['Overloaded circuit', 'A faulty appliance tripped the breaker', 'Loose wire on that circuit'], difficulty: 'beginner', safety: 'warn', warning: 'If it trips again immediately after resetting, stop and call an electrician — that points to a short.', next: 'Unplug devices on that circuit, then reset the breaker by switching it fully off, then on. If it holds, reintroduce devices one at a time.' },
          r_burning: { causes: ['Overheated wiring', 'Failing outlet or switch', 'Damaged insulation'], difficulty: 'advanced', safety: 'danger', warning: 'Do not touch the panel or switch. Burning smells from wiring are a fire risk.', next: 'Turn off the main breaker if it\'s safe to reach, leave the area, and call a licensed electrician immediately.' },
          r_bulb: { causes: ['Burnt-out bulb', 'Loose bulb or fixture connection', 'Failed light switch'], difficulty: 'beginner', safety: 'ok', warning: 'Turn off the switch before touching a bulb that has just been on — it may be hot.', next: 'Replace the bulb with a known-working one. If that doesn\'t fix it, the switch itself may need replacing.' }
        }
      },
      outlet_dead: {
        title: 'An outlet stopped working', category: 'electricity', start: 'q1',
        nodes: {
          q1: { q: 'Does a "reset" or "test" button exist on this or a nearby outlet (GFCI)?', a: [{ l: 'Yes', n: 'r_gfci' }, { l: 'No', n: 'q2' }] },
          q2: { q: 'Do nearby outlets also not work?', a: [{ l: 'Yes', n: 'r_breaker' }, { l: 'No', n: 'r_single' }] },
          r_gfci: { causes: ['Tripped GFCI protection', 'A downstream fault tripped this GFCI outlet'], difficulty: 'beginner', safety: 'ok', warning: 'If it trips again right after resetting, unplug everything on that line first.', next: 'Press the "reset" button firmly. If it won\'t stay reset, a device plugged into that circuit may be faulty.' },
          r_breaker: { causes: ['Tripped breaker', 'Loose connection shared by multiple outlets'], difficulty: 'beginner', safety: 'warn', warning: 'Repeated tripping suggests a wiring problem — don\'t keep resetting it.', next: 'Check the breaker panel for a tripped switch. If it keeps tripping, call an electrician.' },
          r_single: { causes: ['Faulty outlet', 'Loose wire connection inside the box'], difficulty: 'intermediate', safety: 'danger', warning: 'Do not open the outlet unless the breaker for that circuit is off and verified with a tester.', next: 'If comfortable working with power off, verify the breaker is off with a non-contact tester before inspecting. Otherwise call an electrician.' }
        }
      },
      faucet_drip: {
        title: 'Faucet keeps dripping', category: 'plumbing', start: 'q1',
        nodes: {
          q1: { q: 'Does it drip from the spout, or leak from the base/handle?', a: [{ l: 'Spout', n: 'r_spout' }, { l: 'Base/handle', n: 'r_base' }] },
          r_spout: { causes: ['Worn washer or O-ring', 'Worn cartridge (in cartridge-style faucets)'], difficulty: 'beginner', safety: 'ok', warning: 'Shut off the water supply under the sink before disassembling anything.', next: 'Turn off the shutoff valves, remove the handle, and inspect the washer or cartridge for wear — replace with a matching part.' },
          r_base: { causes: ['Worn O-ring at the base', 'Loose mounting nut'], difficulty: 'beginner', safety: 'ok', warning: 'Have a towel ready — water will be in the line even after the valve is closed.', next: 'Turn off the supply, tighten the mounting nut, and replace the O-ring if tightening doesn\'t stop it.' }
        }
      },
      drain_slow: {
        title: 'Drain is slow or clogged', category: 'plumbing', start: 'q1',
        nodes: {
          q1: { q: 'Is it just one drain, or several drains in the house?', a: [{ l: 'One drain', n: 'r_local' }, { l: 'Several drains', n: 'r_main' }] },
          r_local: { causes: ['Hair or soap buildup in the trap', 'Grease buildup (kitchen sinks)'], difficulty: 'beginner', safety: 'ok', warning: 'Avoid chemical drain cleaners repeatedly — they can damage older pipes.', next: 'Try a plunger, then a drain snake for the trap. Remove and clean the P-trap if accessible.' },
          r_main: { causes: ['Blockage in the main sewer line', 'Tree root intrusion', 'Venting issue'], difficulty: 'advanced', safety: 'warn', warning: 'Multiple slow drains at once usually means the problem is beyond what a plunger can fix.', next: 'This points to the main line rather than a single fixture. Call a plumber with a drain camera or snake.' }
        }
      },
      wall_crack: {
        title: 'Crack appeared in a wall', category: 'homerepair', start: 'q1',
        nodes: {
          q1: { q: 'Is the crack wider than a pencil, or does it run diagonally from a door/window corner?', a: [{ l: 'Yes', n: 'r_structural' }, { l: 'No', n: 'r_cosmetic' }] },
          r_structural: { causes: ['Foundation settling', 'Structural movement'], difficulty: 'advanced', safety: 'warn', warning: 'Wide or diagonal cracks near openings can indicate structural movement — don\'t just patch and paint.', next: 'Photograph the crack with a ruler for scale and have a structural engineer or foundation specialist assess it.' },
          r_cosmetic: { causes: ['Drywall settling', 'Seam tape failure', 'Humidity/temperature movement'], difficulty: 'beginner', safety: 'ok', warning: 'None — this is a cosmetic, low-risk repair.', next: 'Widen the crack slightly, apply joint compound or spackle, sand smooth, and repaint.' }
        }
      },
      door_sticking: {
        title: "Door won't close properly", category: 'homerepair', start: 'q1',
        nodes: {
          q1: { q: 'Does it rub at the top corner, or is it hard to latch?', a: [{ l: 'Rubs at top', n: 'r_hinge' }, { l: 'Hard to latch', n: 'r_latch' }] },
          r_hinge: { causes: ['Loose hinge screws', 'House settling shifting the frame'], difficulty: 'beginner', safety: 'ok', warning: 'None — straightforward fix.', next: 'Tighten hinge screws; if the holes are stripped, replace with longer screws into the frame stud.' },
          r_latch: { causes: ['Misaligned strike plate', 'Warped door'], difficulty: 'beginner', safety: 'ok', warning: 'None — straightforward fix.', next: 'Check where the latch meets the strike plate. Adjust the plate position slightly or file the opening.' }
        }
      },
      fridge_warm: {
        title: "Fridge isn't cooling", category: 'appliances', start: 'q1',
        nodes: {
          q1: { q: 'Do the interior lights turn on?', a: [{ l: 'Yes', n: 'q2' }, { l: 'No', n: 'r_power' }] },
          q2: { q: 'Are the condenser coils (back or bottom) covered in dust?', a: [{ l: 'Yes', n: 'r_coils' }, { l: 'No', n: 'r_thermostat' }] },
          r_power: { causes: ['Unplugged or tripped outlet', 'Failed power cord', 'Blown internal fuse'], difficulty: 'intermediate', safety: 'warn', warning: 'Unplug before inspecting the cord or outlet.', next: 'Confirm the outlet has power with another device. If it does, the fridge likely needs a technician.' },
          r_coils: { causes: ['Dust-insulated coils reducing heat exchange'], difficulty: 'beginner', safety: 'ok', warning: 'Unplug the fridge before cleaning near the coils.', next: 'Unplug, pull the fridge out, and vacuum the coils and surrounding area.' },
          r_thermostat: { causes: ['Thermostat set too warm', 'Failing compressor', 'Blocked vents inside'], difficulty: 'intermediate', safety: 'ok', warning: 'If food has been at unsafe temperature for over 2 hours, discard perishables.', next: 'Check the temperature dial first. If it\'s set correctly and coils are clean, this likely needs a repair technician.' }
        }
      },
      washer_noleak: {
        title: "Washing machine won't drain", category: 'appliances', start: 'q1',
        nodes: {
          q1: { q: 'Is the drain hose kinked or is the outlet clogged?', a: [{ l: 'Possibly', n: 'r_hose' }, { l: 'Checked, looks fine', n: 'r_pump' }] },
          r_hose: { causes: ['Kinked drain hose', 'Clogged drain hose or standpipe'], difficulty: 'beginner', safety: 'ok', warning: 'Unplug the machine before inspecting hoses.', next: 'Straighten the hose and check for lint/debris blockage at the connection points.' },
          r_pump: { causes: ['Clogged drain pump filter', 'Failed drain pump', 'Faulty lid switch'], difficulty: 'intermediate', safety: 'warn', warning: 'Unplug and consult your model\'s manual for the pump filter location before opening anything.', next: 'Locate and clean the drain pump filter (common on front-loaders). If draining still fails, the pump may need replacement — consider a technician.' }
        }
      },
      plant_yellow: {
        title: 'Plant leaves turning yellow', category: 'gardening', start: 'q1',
        nodes: {
          q1: { q: 'Is the soil constantly damp/soggy to the touch?', a: [{ l: 'Yes', n: 'r_overwater' }, { l: 'No, it\'s dry', n: 'r_underwater' }] },
          r_overwater: { causes: ['Overwatering / root rot', 'Poor drainage'], difficulty: 'beginner', safety: 'ok', warning: 'None.', next: 'Let soil dry out between waterings and ensure the pot or bed drains freely.' },
          r_underwater: { causes: ['Underwatering', 'Nutrient deficiency (often nitrogen)'], difficulty: 'beginner', safety: 'ok', warning: 'None.', next: 'Water more consistently and consider a balanced fertilizer if yellowing persists.' }
        }
      },
      lawn_patches: {
        title: 'Brown patches in the lawn', category: 'gardening', start: 'q1',
        nodes: {
          q1: { q: 'Are the patches circular and spreading outward?', a: [{ l: 'Yes', n: 'r_fungus' }, { l: 'No, irregular', n: 'r_traffic' }] },
          r_fungus: { causes: ['Fungal lawn disease', 'Overwatering promoting fungus'], difficulty: 'intermediate', safety: 'ok', warning: 'Avoid watering in the evening, which encourages fungal growth.', next: 'Water in the morning only, improve airflow by mowing regularly, and consider a lawn fungicide if it spreads.' },
          r_traffic: { causes: ['Foot traffic compaction', 'Pet urine spots', 'Grub damage'], difficulty: 'beginner', safety: 'ok', warning: 'None.', next: 'Aerate compacted soil, reseed bare spots, and check for grubs by lifting a patch of turf.' }
        }
      },
      drill_weak: {
        title: 'Cordless drill losing power fast', category: 'tools', start: 'q1',
        nodes: {
          q1: { q: 'Is the battery more than 2–3 years old or used heavily?', a: [{ l: 'Yes', n: 'r_battery' }, { l: 'No, fairly new', n: 'r_contacts' }] },
          r_battery: { causes: ['Battery cells degraded with age', 'Battery not fully charging'], difficulty: 'beginner', safety: 'ok', warning: 'None.', next: 'Test with a second battery if you have one. If the issue follows the battery, it likely needs replacing.' },
          r_contacts: { causes: ['Dirty battery/tool contacts', 'Charger not seating fully'], difficulty: 'beginner', safety: 'ok', warning: 'None.', next: 'Clean the contact points on both the battery and the drill with a dry cloth, and check the charger connects fully.' }
        }
      },
      stuck_screw: {
        title: "Screw won't come out", category: 'tools', start: 'q1',
        nodes: {
          q1: { q: 'Is the screw head stripped (driver just spins)?', a: [{ l: 'Yes, stripped', n: 'r_stripped' }, { l: 'No, just stuck', n: 'r_stuck' }] },
          r_stripped: { causes: ['Worn screw head', 'Wrong driver size used'], difficulty: 'intermediate', safety: 'ok', warning: 'Wear eye protection if using extraction tools.', next: 'Try a rubber band between the driver and screw for grip, or use a screw extractor bit.' },
          r_stuck: { causes: ['Paint or rust sealing the threads', 'Cross-threading'], difficulty: 'beginner', safety: 'ok', warning: 'None.', next: 'Apply a penetrating oil, wait a few minutes, and use a driver that fits snugly with firm downward pressure while turning.' }
        }
      },
      musty_smell: {
        title: 'Musty smell in a room', category: 'general', start: 'q1',
        nodes: {
          q1: { q: 'Is the room in a basement or near plumbing, and feels humid?', a: [{ l: 'Yes', n: 'r_mold' }, { l: 'No', n: 'r_other' }] },
          r_mold: { causes: ['Mold or mildew growth', 'Hidden moisture leak'], difficulty: 'intermediate', safety: 'warn', warning: 'Visible black mold on a large area should be assessed by a remediation professional, not scrubbed casually.', next: 'Check behind furniture and under sinks for hidden leaks. Improve ventilation and use a dehumidifier.' },
          r_other: { causes: ['Poor ventilation', 'Old carpet or fabric buildup'], difficulty: 'beginner', safety: 'ok', warning: 'None.', next: 'Air the room out, clean fabrics and carpets, and check for a forgotten damp item (towel, laundry).' }
        }
      },
      squeaky_floor: {
        title: 'Floor squeaks when walked on', category: 'general', start: 'q1',
        nodes: {
          q1: { q: 'Do you have access to the floor from underneath (basement/crawlspace)?', a: [{ l: 'Yes', n: 'r_below' }, { l: 'No', n: 'r_above' }] },
          r_below: { causes: ['Loose subfloor-to-joist connection'], difficulty: 'intermediate', safety: 'ok', warning: 'None.', next: 'From below, have someone walk the squeak spot while you locate the joist and add a screw up into the subfloor.' },
          r_above: { causes: ['Floorboards rubbing together', 'Subfloor movement under flooring'], difficulty: 'beginner', safety: 'ok', warning: 'None.', next: 'Sprinkle talc or a specialty squeak powder into the seam, or use a floor-specific squeak-fix screw kit from above.' }
        }
      }
    }
  };

  /* ---- Home Electricity education section --------------------------------- */
  DATA.electricity = [
    { id: 'breakers', title: 'How circuit breakers work', symptoms: 'A breaker flips to "off" or a middle position, cutting power to part of the house.', causes: ['Circuit overloaded past its rated amperage', 'Short circuit', 'Ground fault'], checks: ['Count how many high-draw devices are on that circuit', 'Note if the trip happens instantly or after time'], call: 'Call an electrician if a breaker trips repeatedly within minutes of resetting.', difficulty: 'beginner' },
    { id: 'fusebox', title: 'Fuse boxes', symptoms: 'Older homes may use fuses instead of breakers — a blown fuse looks discolored or has a broken metal strip.', causes: ['Overloaded circuit', 'Fuse rated too low for the load', 'Aging fuse box'], checks: ['Visually inspect the fuse through its window for a broken filament', 'Confirm the replacement fuse matches the original amperage'], call: 'Call an electrician if you\'re considering upgrading from fuses to breakers — this is panel-level work.', difficulty: 'intermediate' },
    { id: 'grounding', title: 'Grounding', symptoms: 'You feel a mild tingle touching an appliance, or outlets test as "open ground."', causes: ['Missing or disconnected ground wire', 'Two-prong outlet with no ground path'], checks: ['A plug-in outlet tester can confirm ground status in seconds'], call: 'Call an electrician — grounding issues are a shock and fire risk and should not be DIY-repaired.', difficulty: 'advanced' },
    { id: 'voltage', title: 'Voltage basics', symptoms: 'Lights dim when a large appliance starts, or devices behave oddly.', causes: ['Normal voltage sag from high-draw startup', 'Loose neutral connection (more serious)'], checks: ['Note whether dimming is brief (normal) or constant (concerning)'], call: 'Call an electrician if dimming is constant or paired with flickering across the whole house.', difficulty: 'intermediate' },
    { id: 'switches', title: 'Light switches', symptoms: 'A switch feels loose, sparks slightly, or doesn\'t click firmly.', causes: ['Worn switch mechanism', 'Loose wiring behind the switch'], checks: ['Turn off the breaker for that circuit and verify with a tester before removing the switch plate'], call: 'Call an electrician if you see scorch marks or melted plastic.', difficulty: 'intermediate' },
    { id: 'outlets', title: 'Outlets', symptoms: 'An outlet feels warm, a plug fits loosely, or it stops providing power.', causes: ['Worn outlet contacts', 'Loose wire connection', 'Tripped GFCI upstream'], checks: ['Check nearby GFCI outlets for a tripped reset button first — it\'s the most common cause'], call: 'Call an electrician for warm or scorched outlets — replace power immediately in that case.', difficulty: 'beginner' },
    { id: 'smarthome', title: 'Smart home devices', symptoms: 'A smart switch or plug won\'t pair, or trips a breaker.', causes: ['Incompatible neutral wire requirement', 'Wi-Fi/app pairing issue', 'Overloaded smart switch rating'], checks: ['Confirm your existing wiring has a neutral wire, required by most smart switches'], call: 'Call an electrician if your box lacks a neutral wire and you want a hardwired smart switch.', difficulty: 'intermediate' },
    { id: 'led', title: 'LED installation basics', symptoms: 'New LED bulbs flicker or buzz in an old fixture.', causes: ['Incompatible dimmer switch (not LED-rated)', 'Voltage fluctuation'], checks: ['Check whether the dimmer is labeled LED-compatible'], call: 'Call an electrician only if flickering persists after swapping to an LED-rated dimmer.', difficulty: 'beginner' },
    { id: 'commonproblems', title: 'Common electrical problems', symptoms: 'Flickering lights, warm switch plates, frequent trips, buzzing sounds.', causes: ['Loose connections', 'Overloaded circuits', 'Aging wiring'], checks: ['Track when the issue happens — with a specific appliance, or randomly'], call: 'Call an electrician for buzzing sounds, warm switch plates, or repeated trips — these are early fire-risk signs.', difficulty: 'intermediate' }
  ];

  /* ---- Home Repair Knowledge Base ------------------------------------------ */
  DATA.homeRepair = {
    groups: [
      { id: 'plumbing', label: 'Plumbing' },
      { id: 'walls', label: 'Walls' },
      { id: 'doors', label: 'Doors' },
      { id: 'heating', label: 'Heating' },
      { id: 'tools', label: 'Tools' }
    ],
    articles: {
      plumbing: [
        { id: 'leak_faucet', title: 'Leaking faucet', explanation: 'Nearly always a worn internal seal rather than the faucet body itself.', tools: ['Adjustable wrench', 'Replacement washer/cartridge', 'Plumber\'s grease'], steps: ['Shut off the water supply under the sink', 'Remove the handle and retaining nut', 'Inspect and replace the washer, O-ring, or cartridge', 'Reassemble and test'], difficulty: 'beginner', time: '30–45 min', mistakes: ['Forgetting to shut off water first', 'Over-tightening the packing nut, which can crack it'] },
        { id: 'clogged_drain', title: 'Clogged drain', explanation: 'Most clogs sit within the first few feet of pipe, reachable with a plunger or hand snake.', tools: ['Plunger', 'Drain snake', 'Bucket'], steps: ['Remove any visible debris from the drain opening', 'Plunge with steady, firm strokes', 'If unresolved, feed a drain snake in and rotate gently', 'Flush with hot water'], difficulty: 'beginner', time: '20–40 min', mistakes: ['Relying on chemical cleaners repeatedly, which can corrode pipes', 'Forcing the snake too hard and scratching porcelain'] },
        { id: 'toilet_running', title: 'Running toilet', explanation: 'Usually a worn flapper valve not sealing the tank properly.', tools: ['Replacement flapper', 'Adjustable wrench'], steps: ['Remove the tank lid', 'Check if the flapper seals fully after flushing', 'Replace the flapper if worn or warped', 'Adjust the chain length so it\'s not too tight or too loose'], difficulty: 'beginner', time: '15–20 min', mistakes: ['Buying a universal flapper that doesn\'t match tank shape', 'Leaving the chain too taut, which holds the flapper open'] },
        { id: 'low_pressure', title: 'Low water pressure', explanation: 'Often a clogged aerator or showerhead rather than a supply problem.', tools: ['Wrench', 'Vinegar', 'Old toothbrush'], steps: ['Unscrew the faucet aerator or showerhead', 'Soak in vinegar to dissolve mineral buildup', 'Scrub and rinse', 'Reattach and test flow'], difficulty: 'beginner', time: '20 min', mistakes: ['Assuming it\'s the main line when it\'s just one fixture', 'Losing small aerator parts down the drain'] }
      ],
      walls: [
        { id: 'small_hole', title: 'Small holes', explanation: 'Holes under about 1 inch can be filled directly; larger ones need a patch.', tools: ['Spackle', 'Putty knife', 'Sandpaper'], steps: ['Clean loose debris from the hole', 'Apply spackle with a putty knife, slightly overfilled', 'Let dry fully, then sand flush', 'Prime and paint to match'], difficulty: 'beginner', time: '30 min + dry time', mistakes: ['Painting before the spackle fully dries, causing shrinkage marks', 'Skipping primer, causing a visible patch under paint'] },
        { id: 'wall_cracks', title: 'Cracks', explanation: 'Hairline cracks are typically cosmetic; wide or diagonal cracks may signal movement.', tools: ['Joint compound', 'Mesh tape', 'Putty knife'], steps: ['Widen the crack slightly with a utility knife', 'Apply mesh tape over the crack', 'Cover with joint compound in thin layers', 'Sand and paint once dry'], difficulty: 'beginner', time: '1 hr + dry time', mistakes: ['Applying compound too thick in one layer', 'Ignoring recurring cracks that may indicate a structural issue'] },
        { id: 'painting', title: 'Painting', explanation: 'Prep work determines most of the final result more than the paint itself.', tools: ['Painter\'s tape', 'Roller and tray', 'Drop cloth', 'Primer if needed'], steps: ['Clean and lightly sand the surface', 'Tape edges and trim', 'Apply primer if changing colors drastically', 'Roll two coats, letting each dry fully'], difficulty: 'beginner', time: 'Half day', mistakes: ['Skipping tape removal while paint is still slightly wet for clean lines', 'Overloading the roller, causing drips'] }
      ],
      doors: [
        { id: 'hinges', title: 'Hinges', explanation: 'A sagging or squeaking door is almost always a hinge issue, not the door itself.', tools: ['Screwdriver', 'Longer screws', 'Lubricant'], steps: ['Tighten all hinge screws', 'Replace stripped screw holes with longer screws into the frame stud', 'Lubricate hinge pins if squeaking'], difficulty: 'beginner', time: '15 min', mistakes: ['Only tightening the door-side screws and missing the frame side', 'Over-lubricating, which attracts dust'] },
        { id: 'locks', title: 'Locks', explanation: 'Sticky locks are usually a dirty or worn mechanism rather than a misaligned door.', tools: ['Graphite lubricant', 'Screwdriver'], steps: ['Apply graphite or silicone lubricant into the keyway', 'Work the key in and out several times', 'Check the strike plate alignment if the bolt binds'], difficulty: 'beginner', time: '10 min', mistakes: ['Using oil-based lubricant, which attracts grit over time'] },
        { id: 'alignment', title: 'Alignment', explanation: 'Doors shift with seasonal humidity and house settling.', tools: ['Screwdriver', 'Chisel (for strike plate work)'], steps: ['Identify where the door binds against the frame', 'Adjust hinge screws or shim as needed', 'File or reposition the strike plate if the latch doesn\'t catch'], difficulty: 'intermediate', time: '30–45 min', mistakes: ['Planing the door itself before trying simpler hinge adjustments'] }
      ],
      heating: [
        { id: 'radiators', title: 'Radiators', explanation: 'A radiator that\'s cool at the top but hot at the bottom usually has trapped air.', tools: ['Radiator bleed key', 'Cloth'], steps: ['Turn off the heating system', 'Insert the bleed key into the valve and turn slowly', 'Close the valve once water (not air) starts to escape'], difficulty: 'beginner', time: '10 min per radiator', mistakes: ['Bleeding while the system is running hot, risking burns', 'Overtightening the valve, which can strip it'] },
        { id: 'thermostats', title: 'Thermostats', explanation: 'Inconsistent temperatures often trace back to thermostat placement or calibration rather than the furnace.', tools: ['Screwdriver', 'Level'], checks: ['Note if the thermostat is near a heat source or draft that skews readings'], steps: ['Check batteries if it\'s digital', 'Confirm it reads level and is away from direct sun or vents', 'Recalibrate per manufacturer instructions if consistently off'], difficulty: 'beginner', time: '15 min', mistakes: ['Placing a new thermostat in the same flawed spot as the old one'] }
      ],
      tools: [
        { id: 'drill', title: 'Drill', explanation: 'A basic cordless drill covers most home repair tasks.', tools: ['Drill', 'Mixed bit set'], steps: ['Match bit size to the screw or hole needed', 'Use a lower clutch setting for driving screws to avoid stripping', 'Use higher speed with light pressure for drilling holes'], difficulty: 'beginner', time: 'N/A', mistakes: ['Using full power/clutch for delicate screws, stripping the head'] },
        { id: 'screwdriver', title: 'Screwdriver', explanation: 'Matching the driver type and size to the screw prevents most stripping issues.', tools: ['Phillips and flathead set', 'Multi-bit driver'], steps: ['Match the driver head exactly to the screw type', 'Apply firm downward pressure while turning'], difficulty: 'beginner', time: 'N/A', mistakes: ['Using a slightly-wrong size driver "because it fits ok"'] },
        { id: 'measuring', title: 'Measuring tools', explanation: 'Accurate measurement prevents the most common repair mistakes.', tools: ['Tape measure', 'Level', 'Stud finder'], steps: ['Measure twice before cutting or drilling', 'Use a level to confirm horizontal/vertical alignment', 'Use a stud finder before mounting anything heavy'], difficulty: 'beginner', time: 'N/A', mistakes: ['Reading the wrong side of a tape measure\'s hook', 'Skipping the stud finder for heavy items'] }
      ]
    }
  };

  /* ---- Car Assistant ------------------------------------------------------ */
  DATA.car = {
    categories: [
      { id: 'engine', label: 'Engine' },
      { id: 'battery', label: 'Battery' },
      { id: 'brakes', label: 'Brakes' },
      { id: 'tires', label: 'Tires' },
      { id: 'fluids', label: 'Fluids' },
      { id: 'electrical', label: 'Electrical' },
      { id: 'dashboard', label: 'Dashboard Warnings' }
    ],
    problems: {
      engine: ['wont_start'],
      battery: ['battery_dies'],
      brakes: ['brake_noise'],
      tires: ['tire_pressure'],
      fluids: ['fluid_leak'],
      electrical: ['electrical_gremlins'],
      dashboard: ['warning_light']
    },
    trees: {
      wont_start: {
        title: "Car won't start", category: 'engine', start: 'q1',
        nodes: {
          q1: { q: 'Do you hear rapid clicking when you turn the key?', a: [{ l: 'Yes', n: 'r_click' }, { l: 'No', n: 'q2' }] },
          q2: { q: 'Does the dashboard light up at all?', a: [{ l: 'Yes', n: 'r_starter' }, { l: 'No', n: 'r_dead' }] },
          r_click: { causes: ['Weak or dead battery', 'Corroded battery terminals'], difficulty: 'beginner', safety: 'ok', warning: 'Wear gloves and eye protection if inspecting battery terminals.', next: 'Check terminal connections for corrosion and tightness. Try a jump start if the battery is suspected.' },
          r_starter: { causes: ['Faulty starter motor', 'Fuel delivery issue', 'Ignition switch problem'], difficulty: 'advanced', safety: 'warn', warning: 'Repeated cranking without starting can flood the engine — don\'t keep trying indefinitely.', next: 'This points beyond a simple battery issue. A mechanic can test the starter and fuel system.' },
          r_dead: { causes: ['Fully dead battery', 'Blown main fuse', 'Loose battery cable'], difficulty: 'beginner', safety: 'ok', warning: 'Never lean directly over the battery while jump-starting.', next: 'Check cable connections first, then attempt a jump start following proper polarity order.' }
        }
      },
      battery_dies: {
        title: 'Battery keeps dying', category: 'battery', start: 'q1',
        nodes: {
          q1: { q: 'Is the battery more than 3–4 years old?', a: [{ l: 'Yes', n: 'r_age' }, { l: 'No', n: 'q2' }] },
          q2: { q: 'Do interior lights or accessories get left on sometimes?', a: [{ l: 'Possibly', n: 'r_drain' }, { l: 'No', n: 'r_alternator' }] },
          r_age: { causes: ['Battery reaching end of life'], difficulty: 'beginner', safety: 'ok', warning: 'None.', next: 'Have the battery load-tested at an auto parts store — many do this free.' },
          r_drain: { causes: ['Interior light or accessory left on', 'Aftermarket device drawing power when off'], difficulty: 'beginner', safety: 'ok', warning: 'None.', next: 'Double-check all lights and accessories are off before leaving the car for extended periods.' },
          r_alternator: { causes: ['Failing alternator not recharging the battery while driving'], difficulty: 'intermediate', safety: 'warn', warning: 'Driving with a failing alternator can leave you stranded — have it tested soon.', next: 'A mechanic can test alternator output in minutes with a multimeter.' }
        }
      },
      brake_noise: {
        title: 'Brakes making noise', category: 'brakes', start: 'q1',
        nodes: {
          q1: { q: 'Is it a high-pitched squeal, or a deep grinding sound?', a: [{ l: 'Squeal', n: 'r_squeal' }, { l: 'Grinding', n: 'r_grind' }] },
          r_squeal: { causes: ['Brake pad wear indicator contacting the rotor (by design)', 'Dust or debris on the rotor'], difficulty: 'intermediate', safety: 'warn', warning: 'Squealing is often an early built-in warning — don\'t ignore it for long.', next: 'Have pad thickness checked soon. It\'s often a routine pad replacement if caught early.' },
          r_grind: { causes: ['Pads fully worn, metal-on-metal contact', 'Damaged rotor'], difficulty: 'advanced', safety: 'danger', warning: 'Grinding means reduced stopping power. Avoid driving further than necessary and get it inspected immediately.', next: 'Do not delay — have brakes inspected by a mechanic right away, this affects your ability to stop safely.' }
        }
      },
      tire_pressure: {
        title: 'Tire pressure warning or uneven wear', category: 'tires', start: 'q1',
        nodes: {
          q1: { q: 'Is one tire consistently lower than the others?', a: [{ l: 'Yes', n: 'r_puncture' }, { l: 'No, all similar', n: 'r_seasonal' }] },
          r_puncture: { causes: ['Slow puncture or leak', 'Faulty valve stem'], difficulty: 'beginner', safety: 'ok', warning: 'Don\'t drive far on a significantly underinflated tire — it can damage the sidewall.', next: 'Inflate to spec and check again in a day. If it drops again, inspect for a nail or have it checked at a tire shop.' },
          r_seasonal: { causes: ['Normal pressure drop from cold weather', 'All tires aging together'], difficulty: 'beginner', safety: 'ok', warning: 'None.', next: 'Top off all tires to the pressure listed on the driver-door jamb sticker (not the tire sidewall max).' }
        }
      },
      fluid_leak: {
        title: 'Fluid leaking under the car', category: 'fluids', start: 'q1',
        nodes: {
          q1: { q: 'What color is the fluid?', a: [{ l: 'Clear/light', n: 'r_water' }, { l: 'Red or brown/black', n: 'r_oiltrans' }, { l: 'Green/orange/pink', n: 'r_coolant' }] },
          r_water: { causes: ['Normal AC condensation (very common, harmless)'], difficulty: 'beginner', safety: 'ok', warning: 'None — this is usually completely normal, especially after AC use.', next: 'No action needed if it\'s clear and only appears after driving with AC on.' },
          r_oiltrans: { causes: ['Engine oil leak', 'Transmission fluid leak'], difficulty: 'intermediate', safety: 'warn', warning: 'Check your oil level soon — running low on oil can seriously damage the engine.', next: 'Check the dipstick level and have a mechanic identify the leak source if it continues.' },
          r_coolant: { causes: ['Coolant leak from hose, radiator, or water pump'], difficulty: 'intermediate', safety: 'warn', warning: 'Never open a hot radiator cap. Driving with low coolant risks overheating and engine damage.', next: 'Check coolant level when the engine is cool, and have the leak source diagnosed soon.' }
        }
      },
      electrical_gremlins: {
        title: 'Random electrical issues', category: 'electrical', start: 'q1',
        nodes: {
          q1: { q: 'Did this start after a battery replacement or jump start?', a: [{ l: 'Yes', n: 'r_reset' }, { l: 'No', n: 'r_fuse' }] },
          r_reset: { causes: ['Electronics needing to relearn/reset after power loss'], difficulty: 'beginner', safety: 'ok', warning: 'None.', next: 'Some systems (windows, radio presets) reset after a battery disconnect — check your manual for a relearn procedure.' },
          r_fuse: { causes: ['Blown fuse for that specific system', 'Loose ground connection'], difficulty: 'beginner', safety: 'ok', warning: 'Check the fuse box diagram before pulling fuses.', next: 'Check the fuse box (often has a diagram on the cover) for a blown fuse matching the affected system.' }
        }
      },
      warning_light: {
        title: 'Dashboard warning light is on', category: 'dashboard', start: 'q1',
        nodes: {
          q1: { q: 'Is the light red, or yellow/orange?', a: [{ l: 'Red', n: 'r_red' }, { l: 'Yellow/orange', n: 'r_yellow' }] },
          r_red: { causes: ['Critical system needing immediate attention (oil pressure, temperature, brakes)'], difficulty: 'advanced', safety: 'danger', warning: 'Red warning lights typically mean stop driving and address it now, especially oil pressure or temperature.', next: 'Pull over safely and check your owner\'s manual for that specific icon. Don\'t continue driving on a red oil or temperature light.' },
          r_yellow: { causes: ['Non-urgent system alert (check engine, tire pressure, maintenance reminder)'], difficulty: 'intermediate', safety: 'warn', warning: 'Yellow lights usually allow continued careful driving but shouldn\'t be ignored long-term.', next: 'Look up the specific icon in your owner\'s manual. A check-engine light can often be read with an inexpensive code scanner.' }
        }
      }
    }
  };

  /* ---- Tool Advisor --------------------------------------------------------- */
  DATA.toolAdvisor = [
    { id: 'hang_shelf', task: 'Hang a shelf', tools: ['Drill', 'Level', 'Screws & wall anchors', 'Stud finder', 'Tape measure'], difficulty: 'beginner', tip: 'Anchor into a stud whenever possible for anything heavier than a few books.' },
    { id: 'mount_tv', task: 'Mount a TV', tools: ['Drill', 'Stud finder', 'Level', 'Mounting bracket', 'Socket wrench set'], difficulty: 'intermediate', tip: 'Always mount into at least two studs — drywall anchors alone aren\'t rated for TV weight.' },
    { id: 'paint_room', task: 'Paint a room', tools: ['Roller & tray', 'Painter\'s tape', 'Drop cloths', 'Angled brush', 'Sandpaper'], difficulty: 'beginner', tip: 'Buy slightly more paint than calculated — running out mid-wall creates visible lines.' },
    { id: 'fix_leaky_pipe', task: 'Fix a leaky pipe joint', tools: ['Pipe wrench', 'Plumber\'s tape', 'Bucket', 'Replacement fitting'], difficulty: 'intermediate', tip: 'Shut off the water supply and relieve pressure before disconnecting anything.' },
    { id: 'assemble_furniture', task: 'Assemble flat-pack furniture', tools: ['Screwdriver set', 'Rubber mallet', 'Allen key set (often included)'], difficulty: 'beginner', tip: 'Lay out and count all hardware before starting — missing a bag mid-build is the most common frustration.' },
    { id: 'replace_faucet', task: 'Replace a faucet', tools: ['Basin wrench', 'Adjustable wrench', 'Plumber\'s putty or tape', 'Bucket'], difficulty: 'intermediate', tip: 'Take a photo of the under-sink connections before disconnecting anything.' },
    { id: 'patch_drywall', task: 'Patch a drywall hole', tools: ['Drywall patch kit', 'Putty knife', 'Sandpaper', 'Primer'], difficulty: 'beginner', tip: 'For holes bigger than a fist, use a scrap-drywall patch rather than just filler.' },
    { id: 'build_raised_bed', task: 'Build a raised garden bed', tools: ['Circular saw', 'Drill', 'Exterior screws', 'Tape measure', 'Level'], difficulty: 'intermediate', tip: 'Use rot-resistant wood (cedar) and avoid chemically treated lumber near edible plants.' }
  ];

  /* ---- Emergency Guides ----------------------------------------------------- */
  DATA.emergency = [
    { id: 'water_leak', title: 'Water leak', steps: ['Shut off the main water valve (usually near the water meter or where the line enters the house)', 'Move electronics and valuables away from the water', 'Soak up standing water to limit damage', 'Call a plumber if the source isn\'t obvious'], warning: 'If water is near any electrical outlets or panels, avoid the area and shut off power at the breaker if it can be reached safely.' },
    { id: 'power_outage', title: 'Power outage', steps: ['Check if neighbors also lost power — if so, it\'s likely a utility issue', 'Turn off or unplug sensitive electronics to avoid surge damage on restoration', 'Keep the fridge/freezer closed to preserve cold', 'Report the outage to your utility provider'], warning: 'Never use a generator indoors or in an enclosed garage — carbon monoxide risk.' },
    { id: 'gas_smell', title: 'Gas smell', steps: ['Do not switch any lights or electrical devices on or off', 'Do not light matches, lighters, or create any spark', 'Leave the house immediately and get everyone out', 'Call your gas utility\'s emergency line or 911 from outside the house'], warning: 'This is a life-safety emergency. Leave first, then call — do not investigate the source yourself.' },
    { id: 'car_breakdown', title: 'Car breakdown', steps: ['Steer to the shoulder or a safe area away from traffic', 'Turn on hazard lights immediately', 'Stay inside the vehicle if on a busy road; exit on the side away from traffic if needed', 'Call roadside assistance or a tow service'], warning: 'Avoid standing behind or beside the vehicle on active roadways.' },
    { id: 'flat_tire', title: 'Flat tire', steps: ['Pull off the road to a flat, stable surface', 'Turn on hazard lights', 'Use the jack and spare per your owner\'s manual, or call roadside assistance', 'Drive cautiously to a tire shop even on a "full-size" spare'], warning: 'Never get under a car supported only by a jack — use jack stands, or don\'t go underneath at all.' }
  ];

  /* ---- Knowledge Quiz --------------------------------------------------------- */
  DATA.quiz = {
    categories: ['Cars', 'Electricity', 'Tools', 'Science', 'Home'],
    questions: [
      { cat: 'Cars', diff: 'beginner', q: 'Rapid clicking when starting a car most often points to:', options: ['A weak/dead battery', 'Low tire pressure', 'A blown headlight'], correct: 0 },
      { cat: 'Cars', diff: 'beginner', q: 'What should you check on the driver-door jamb sticker?', options: ['Oil type', 'Recommended tire pressure', 'Paint color code'], correct: 1 },
      { cat: 'Cars', diff: 'intermediate', q: 'Grinding brake noise usually means:', options: ['Normal wear indicator', 'Pads worn to metal-on-metal', 'Low washer fluid'], correct: 1 },
      { cat: 'Cars', diff: 'intermediate', q: 'A red temperature warning light means you should:', options: ['Keep driving to the next town', 'Pull over and stop driving', 'Turn up the radio'], correct: 1 },
      { cat: 'Cars', diff: 'beginner', q: 'Clear fluid dripping under the car after AC use is usually:', options: ['A coolant leak', 'Normal condensation', 'A brake fluid leak'], correct: 1 },
      { cat: 'Cars', diff: 'advanced', q: 'A failing alternator mainly affects:', options: ['Tire pressure', 'Recharging the battery while driving', 'Engine oil level'], correct: 1 },
      { cat: 'Electricity', diff: 'beginner', q: 'A tripped breaker should first be:', options: ['Left off permanently', 'Reset after unplugging devices on that circuit', 'Taped over'], correct: 1 },
      { cat: 'Electricity', diff: 'beginner', q: 'A GFCI outlet is most often found:', options: ['In bedrooms only', 'Near water, like kitchens and bathrooms', 'In the attic'], correct: 1 },
      { cat: 'Electricity', diff: 'intermediate', q: 'A burning smell near a panel means you should:', options: ['Open the panel to look', 'Leave the area and call an electrician', 'Ignore it if lights still work'], correct: 1 },
      { cat: 'Electricity', diff: 'advanced', q: 'Grounding issues are best handled by:', options: ['A quick DIY fix with tape', 'A licensed electrician', 'Ignoring if nothing sparks'], correct: 1 },
      { cat: 'Electricity', diff: 'beginner', q: 'Flickering lights when a large appliance starts is usually:', options: ['Always dangerous', 'Often normal brief voltage sag', 'A sign of a gas leak'], correct: 1 },
      { cat: 'Electricity', diff: 'intermediate', q: 'LED bulbs flickering in an old dimmer usually means:', options: ['The dimmer isn\'t LED-rated', 'The bulb is defective', 'The breaker is failing'], correct: 0 },
      { cat: 'Tools', diff: 'beginner', q: 'A stripped screw head is often caused by:', options: ['Using the correctly sized driver', 'Using the wrong driver size or too little pressure', 'Using a stud finder'], correct: 1 },
      { cat: 'Tools', diff: 'beginner', q: 'A stud finder is mainly used to:', options: ['Measure paint coverage', 'Locate structural studs behind drywall', 'Test electrical voltage'], correct: 1 },
      { cat: 'Tools', diff: 'intermediate', q: 'On a cordless drill, a lower clutch setting is best for:', options: ['Drilling deep holes in concrete', 'Driving screws without stripping them', 'Charging the battery'], correct: 1 },
      { cat: 'Tools', diff: 'beginner', q: 'Which tool best confirms a wall is level?', options: ['Tape measure', 'Level', 'Screwdriver'], correct: 1 },
      { cat: 'Science', diff: 'beginner', q: 'Water boils at sea level at approximately:', options: ['100°C / 212°F', '50°C / 122°F', '150°C / 302°F'], correct: 0 },
      { cat: 'Science', diff: 'intermediate', q: 'Rust forms on iron mainly due to a reaction with:', options: ['Nitrogen', 'Oxygen and moisture', 'Carbon dioxide alone'], correct: 1 },
      { cat: 'Science', diff: 'beginner', q: 'Which gas do smoke/CO detectors commonly warn about?', options: ['Carbon monoxide', 'Helium', 'Nitrogen'], correct: 0 },
      { cat: 'Science', diff: 'intermediate', q: 'Copper is widely used in wiring mainly because it is:', options: ['Cheap and heavy', 'A highly conductive, ductile metal', 'Magnetic'], correct: 1 },
      { cat: 'Home', diff: 'beginner', q: 'A musty smell in a basement often points to:', options: ['Fresh paint', 'Excess moisture or mold', 'New carpet smell only'], correct: 1 },
      { cat: 'Home', diff: 'beginner', q: 'The most common cause of a slow single drain is:', options: ['Main sewer line collapse', 'Hair/soap buildup in the trap', 'Low water pressure'], correct: 1 },
      { cat: 'Home', diff: 'intermediate', q: 'A wide, diagonal crack from a doorframe corner may indicate:', options: ['Normal drywall settling', 'Possible structural movement', 'Nothing worth checking'], correct: 1 },
      { cat: 'Home', diff: 'beginner', q: 'A running toilet is most often caused by:', options: ['A worn flapper valve', 'Low water pressure', 'A tripped breaker'], correct: 0 }
    ]
  };

  /* ---- Learning Paths ----------------------------------------------------------- */
  DATA.learningPaths = [
    {
      id: 'home_maintenance', title: 'Become better at home maintenance',
      levels: [
        { title: 'Basic tools', desc: 'Get familiar with the core toolkit: drill, screwdrivers, level, stud finder, tape measure.', link: { tab: 'toolAdvisor' } },
        { title: 'Understanding electricity', desc: 'Learn how breakers, outlets, and switches work so you can spot normal vs. dangerous issues.', link: { tab: 'electricity' } },
        { title: 'Simple repairs', desc: 'Practice drywall patches, sticky doors, and dripping faucets — the highest-frequency home issues.', link: { tab: 'homeRepair' } },
        { title: 'Advanced DIY', desc: 'Move into more involved projects like fixture replacement, once the basics are second nature.', link: { tab: 'homeRepair' } }
      ]
    },
    {
      id: 'car_basics', title: 'Car ownership basics',
      levels: [
        { title: 'Know your dashboard', desc: 'Learn what red vs. yellow warning lights mean before you\'re stuck figuring it out roadside.', link: { tab: 'car' } },
        { title: 'Fluids & tires', desc: 'Understand what to check monthly: tire pressure, oil level, coolant.', link: { tab: 'car' } },
        { title: 'Battery & electrical', desc: 'Learn to read early signs of a failing battery or alternator.', link: { tab: 'car' } },
        { title: 'Build a maintenance habit', desc: 'Start logging services so nothing gets missed.', link: { tab: 'tracker' } }
      ]
    }
  ];

  /* ======================================================================
     2. Store — thin localStorage wrapper
     ====================================================================== */

  const Store = {
    KEYS: { saved: 'eea_saved_items', tracker: 'eea_maintenance', quizScores: 'eea_quiz_scores', pathProgress: 'eea_path_progress' },
    _get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) { return fallback; }
    },
    _set(key, val) {
      try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* storage unavailable — fail silently */ }
    },
    getSaved() { return this._get(this.KEYS.saved, []); },
    toggleSaved(item) {
      const saved = this.getSaved();
      const idx = saved.findIndex(s => s.id === item.id && s.type === item.type);
      if (idx > -1) { saved.splice(idx, 1); } else { saved.push(item); }
      this._set(this.KEYS.saved, saved);
      return idx === -1;
    },
    isSaved(id, type) { return this.getSaved().some(s => s.id === id && s.type === type); },

    getTracker() { return this._get(this.KEYS.tracker, []); },
    addTrackerEntry(entry) {
      const list = this.getTracker();
      list.push(entry);
      this._set(this.KEYS.tracker, list);
    },
    removeTrackerEntry(id) {
      this._set(this.KEYS.tracker, this.getTracker().filter(e => e.id !== id));
    },

    getQuizScores() { return this._get(this.KEYS.quizScores, []); },
    addQuizScore(entry) {
      const list = this.getQuizScores();
      list.push(entry);
      this._set(this.KEYS.quizScores, list);
    },

    getPathProgress() { return this._get(this.KEYS.pathProgress, {}); },
    setLevelComplete(pathId, levelIdx) {
      const prog = this.getPathProgress();
      prog[pathId] = Math.max(prog[pathId] || 0, levelIdx + 1);
      this._set(this.KEYS.pathProgress, prog);
    }
  };

  /* ======================================================================
     3. Diagnostic engine — shared by Troubleshooting Assistant + Car Assistant
     ====================================================================== */

  function renderDiagnostic(tree, mount, onExit) {
    let path = [];       // array of {nodeId, label}
    let current = tree.start;

    function renderStep() {
      const node = tree.nodes[current];
      const isResult = !node.a;

      const traceHtml = path.map((p, i) =>
        `<span class="eea-trace-node done"><span class="eea-trace-dot"></span>${escapeHtml(p.label)}</span><span class="eea-trace-line"></span>`
      ).join('') + `<span class="eea-trace-node ${isResult ? 'done' : 'current'}"><span class="eea-trace-dot"></span>${isResult ? 'Result' : 'Question ' + (path.length + 1)}</span>`;

      if (!isResult) {
        mount.innerHTML = `
          <div class="eea-schematic">
            <div class="eea-trace">${traceHtml}</div>
            <p class="eea-q">${escapeHtml(node.q)}</p>
            <div class="eea-answers">
              ${node.a.map((opt, i) => `<button class="eea-btn ghost" data-opt="${i}">${escapeHtml(opt.l)}</button>`).join('')}
            </div>
          </div>`;
        mount.querySelectorAll('[data-opt]').forEach(btn => {
          btn.addEventListener('click', () => {
            const opt = node.a[Number(btn.dataset.opt)];
            path.push({ nodeId: current, label: opt.l });
            current = opt.n;
            renderStep();
          });
        });
      } else {
        const safetyClass = node.safety === 'danger' ? 'danger' : node.safety === 'warn' ? 'warn' : 'ok';
        const safetyLabel = node.safety === 'danger' ? 'Call a professional' : node.safety === 'warn' ? 'Proceed with caution' : 'Safe to try yourself';
        mount.innerHTML = `
          <div class="eea-schematic">
            <div class="eea-trace">${traceHtml}</div>
          </div>
          <div class="eea-result-card">
            <span class="eea-badge b-${node.difficulty}">${node.difficulty}</span>
            <h4 style="margin-top:14px;">Likely causes</h4>
            <ul class="eea-cause-list">${node.causes.map(c => `<li>${escapeHtml(c)}</li>`).join('')}</ul>
            <div class="eea-callout ${safetyClass}">
              <span class="cl-label">${safetyLabel}</span>
              ${escapeHtml(node.warning)}
            </div>
            <h4>Recommended next step</h4>
            <p>${escapeHtml(node.next)}</p>
            <div style="display:flex; gap:10px; margin-top:16px; flex-wrap:wrap;">
              <button class="eea-btn ghost sm" id="diag-restart">Start over</button>
              <button class="eea-btn ghost sm" id="diag-exit">Back to problems</button>
            </div>
          </div>`;
        mount.querySelector('#diag-restart').addEventListener('click', () => { path = []; current = tree.start; renderStep(); });
        mount.querySelector('#diag-exit').addEventListener('click', onExit);
      }
    }
    renderStep();
  }

  /* ======================================================================
     Utility helpers
     ====================================================================== */

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str).replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
  }
  function el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }
  function difficultyDots(level) {
    const map = { beginner: 1, intermediate: 2, advanced: 3 };
    const n = map[level] || 1;
    let dots = '';
    for (let i = 1; i <= 3; i++) dots += `<span class="${i <= n ? 'on' : ''}"></span>`;
    return `<span class="eea-difficulty-dots">${dots}</span>`;
  }
  function saveButton(id, type, extra) {
    const saved = Store.isSaved(id, type);
    return `<button class="eea-save-btn ${saved ? 'saved' : ''}" data-save-id="${id}" data-save-type="${type}" title="${saved ? 'Remove from saved' : 'Save for later'}">${saved ? '★' : '☆'}</button>`;
  }
  function wireSaveButtons(root, itemLookup) {
    root.querySelectorAll('[data-save-id]').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const id = btn.dataset.saveId, type = btn.dataset.saveType;
        const item = itemLookup(id, type);
        const nowSaved = Store.toggleSaved(item);
        btn.classList.toggle('saved', nowSaved);
        btn.textContent = nowSaved ? '★' : '☆';
        btn.title = nowSaved ? 'Remove from saved' : 'Save for later';
      });
    });
  }

  /* ======================================================================
     4. View renderers
     ====================================================================== */

  const view = document.getElementById('eea-view');

  function renderHome() {
    view.innerHTML = `
      <div class="eea-hero">
        <div class="eea-hero-tag">Field manual — v1</div>
        <h1>Fix it right, or know when <span>not to.</span></h1>
        <p>A practical assistant for homeowners, DIY beginners, and car owners. Diagnose common problems, learn the basics, and know exactly when a job is beyond DIY.</p>
        <div class="eea-hero-actions">
          <button class="eea-btn" data-goto="troubleshoot">Start troubleshooting</button>
          <button class="eea-btn ghost" data-goto="emergency">Emergency guides</button>
        </div>
      </div>
      <div class="eea-eyebrow">Jump to a section</div>
      <div class="eea-quicklinks">
        ${TABS.filter(t => t.id !== 'home').map(t => `
          <div class="eea-quicklink" data-goto="${t.id}">
            <div class="ql-icon">${t.icon}</div>
            <div class="ql-name">${t.label}</div>
          </div>`).join('')}
      </div>
      <div class="eea-support-card">
        <div class="sc-text">
          <div class="sc-eyebrow">Free &amp; ad-free</div>
          <h3>Keep this running</h3>
          <p>Everyday Expert Assistant is free to use, with no ads and no accounts. If it's saved you a call-out or a bad guess, a small ${escapeHtml(CONFIG.supportPlatform)} tip helps keep it maintained and growing.</p>
        </div>
        <a class="eea-btn" href="${CONFIG.supportUrl}" target="_blank" rel="noopener noreferrer">☕ Support this project</a>
      </div>
    `;
    view.querySelectorAll('[data-goto]').forEach(node => node.addEventListener('click', () => navigate(node.dataset.goto)));
  }

  /* ---- Troubleshooting Assistant view ---- */
  function renderTroubleshoot() {
    let stage = { level: 'category' }; // category -> problem -> diagnostic

    function draw() {
      if (stage.level === 'category') {
        view.innerHTML = `
          <div class="eea-section-head">
            <div><div class="eea-eyebrow">Guided diagnosis</div><h1 class="eea-h1">Smart Troubleshooting</h1><p class="eea-sub">Pick a category, then answer a few quick questions to narrow down the likely cause.</p></div>
          </div>
          <div class="eea-grid dense" id="cat-grid"></div>`;
        const grid = view.querySelector('#cat-grid');
        DATA.troubleshoot.categories.forEach(cat => {
          const card = el(`<div class="eea-bracket eea-clickable" style="text-align:center; padding:24px 14px;">
            <div style="font-size:26px;">${cat.icon}</div>
            <div style="font-family:var(--f-display); text-transform:uppercase; margin-top:10px; font-size:13.5px;">${escapeHtml(cat.label)}</div>
          </div>`);
          card.addEventListener('click', () => {
            if (cat.id === 'car') { navigate('car'); return; }
            stage = { level: 'problem', category: cat.id };
            draw();
          });
          grid.appendChild(card);
        });
      } else if (stage.level === 'problem') {
        const cat = DATA.troubleshoot.categories.find(c => c.id === stage.category);
        const problemIds = DATA.troubleshoot.problems[stage.category] || [];
        view.innerHTML = `
          <button class="eea-crumb" id="back-cat">← Categories</button>
          <div class="eea-section-head"><div><div class="eea-eyebrow">${cat.icon} ${escapeHtml(cat.label)}</div><h1 class="eea-h1">What's the problem?</h1></div></div>
          <div class="eea-grid" id="prob-grid"></div>`;
        view.querySelector('#back-cat').addEventListener('click', () => { stage = { level: 'category' }; draw(); });
        const grid = view.querySelector('#prob-grid');
        problemIds.forEach(pid => {
          const tree = DATA.troubleshoot.trees[pid];
          const card = el(`<div class="eea-bracket eea-clickable"><div style="font-family:var(--f-display); text-transform:uppercase; font-size:14.5px;">${escapeHtml(tree.title)}</div><p style="color:var(--text-muted); font-size:12.5px; margin:8px 0 0;">Tap to start the guided check</p></div>`);
          card.addEventListener('click', () => { stage = { level: 'diagnostic', category: stage.category, problem: pid }; draw(); });
          grid.appendChild(card);
        });
      } else if (stage.level === 'diagnostic') {
        const tree = DATA.troubleshoot.trees[stage.problem];
        view.innerHTML = `
          <button class="eea-crumb" id="back-prob">← Problems</button>
          <div class="eea-section-head"><div><div class="eea-eyebrow">Guided diagnosis</div><h1 class="eea-h1">${escapeHtml(tree.title)}</h1></div></div>
          <div id="diag-mount"></div>`;
        view.querySelector('#back-prob').addEventListener('click', () => { stage = { level: 'problem', category: stage.category }; draw(); });
        renderDiagnostic(tree, view.querySelector('#diag-mount'), () => { stage = { level: 'problem', category: stage.category }; draw(); });
      }
    }
    draw();
  }

  /* ---- Home Electricity view ---- */
  function renderElectricity() {
    let openId = null;
    function draw() {
      if (!openId) {
        view.innerHTML = `
          <div class="eea-section-head"><div><div class="eea-eyebrow">Educational basics</div><h1 class="eea-h1">Home Electricity</h1><p class="eea-sub">Understand how the system works, what's normal, and what needs a licensed electrician.</p></div></div>
          <div class="eea-grid" id="elec-grid"></div>`;
        const grid = view.querySelector('#elec-grid');
        DATA.electricity.forEach(topic => {
          const card = el(`<div class="eea-bracket eea-clickable" data-id="${topic.id}">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <div style="font-family:var(--f-display); text-transform:uppercase; font-size:14px;">${escapeHtml(topic.title)}</div>
              ${saveButton(topic.id, 'electricity')}
            </div>
            <p style="color:var(--text-muted); font-size:12.5px; margin:10px 0 0;">${escapeHtml(topic.symptoms)}</p>
            <div style="margin-top:10px;">${difficultyDots(topic.difficulty)}</div>
          </div>`);
          card.addEventListener('click', (ev) => { if (ev.target.closest('[data-save-id]')) return; openId = topic.id; draw(); });
          grid.appendChild(card);
        });
        wireSaveButtons(view, (id) => ({ id, type: 'electricity', title: DATA.electricity.find(t => t.id === id).title, tab: 'electricity' }));
      } else {
        const topic = DATA.electricity.find(t => t.id === openId);
        view.innerHTML = `
          <button class="eea-crumb" id="back">← All topics</button>
          <div class="eea-section-head"><div><h1 class="eea-h1">${escapeHtml(topic.title)}</h1></div>${saveButton(topic.id, 'electricity')}</div>
          <div class="eea-bracket eea-article">
            <span class="eea-badge b-${topic.difficulty}">${topic.difficulty}</span>
            <h4>Symptoms</h4><p>${escapeHtml(topic.symptoms)}</p>
            <h4>Possible causes</h4><ul>${topic.causes.map(c => `<li>${escapeHtml(c)}</li>`).join('')}</ul>
            <h4>Safe checks</h4><ul>${topic.checks.map(c => `<li>${escapeHtml(c)}</li>`).join('')}</ul>
            <div class="eea-callout warn"><span class="cl-label">When to call an electrician</span>${escapeHtml(topic.call)}</div>
          </div>`;
        view.querySelector('#back').addEventListener('click', () => { openId = null; draw(); });
        wireSaveButtons(view, (id) => ({ id, type: 'electricity', title: topic.title, tab: 'electricity' }));
      }
    }
    draw();
  }

  /* ---- Home Repair Knowledge Base view ---- */
  function renderHomeRepair() {
    let activeGroup = DATA.homeRepair.groups[0].id;
    let openId = null;

    function draw() {
      if (openId) {
        let art = null;
        Object.values(DATA.homeRepair.articles).forEach(list => { const f = list.find(a => a.id === openId); if (f) art = f; });
        view.innerHTML = `
          <button class="eea-crumb" id="back">← Home Repair</button>
          <div class="eea-section-head"><div><h1 class="eea-h1">${escapeHtml(art.title)}</h1></div>${saveButton(art.id, 'homerepair')}</div>
          <div class="eea-bracket eea-article">
            <span class="eea-badge b-${art.difficulty}">${art.difficulty}</span>
            <div class="eea-stat-row">
              <div class="eea-stat"><b>${escapeHtml(art.time)}</b>Estimated time</div>
            </div>
            <h4>Explanation</h4><p>${escapeHtml(art.explanation)}</p>
            <h4>Required tools</h4><ul>${art.tools.map(t => `<li>${escapeHtml(t)}</li>`).join('')}</ul>
            <h4>Steps</h4><ul>${art.steps.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>
            <h4>Common mistakes</h4><ul>${art.mistakes.map(m => `<li>${escapeHtml(m)}</li>`).join('')}</ul>
          </div>`;
        view.querySelector('#back').addEventListener('click', () => { openId = null; draw(); });
        wireSaveButtons(view, (id) => ({ id, type: 'homerepair', title: art.title, tab: 'homeRepair' }));
        return;
      }
      view.innerHTML = `
        <div class="eea-section-head"><div><div class="eea-eyebrow">Knowledge base</div><h1 class="eea-h1">Home Repair</h1><p class="eea-sub">Step-by-step basics for the most common household fixes.</p></div></div>
        <div class="eea-chip-row" id="group-row" style="margin-bottom:20px;"></div>
        <div class="eea-grid" id="repair-grid"></div>`;
      const row = view.querySelector('#group-row');
      DATA.homeRepair.groups.forEach(g => {
        const chip = el(`<button class="eea-chip ${g.id === activeGroup ? 'active' : ''}">${escapeHtml(g.label)}</button>`);
        chip.addEventListener('click', () => { activeGroup = g.id; draw(); });
        row.appendChild(chip);
      });
      const grid = view.querySelector('#repair-grid');
      (DATA.homeRepair.articles[activeGroup] || []).forEach(art => {
        const card = el(`<div class="eea-bracket eea-clickable" data-id="${art.id}">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div style="font-family:var(--f-display); text-transform:uppercase; font-size:14px;">${escapeHtml(art.title)}</div>
            ${saveButton(art.id, 'homerepair')}
          </div>
          <p style="color:var(--text-muted); font-size:12.5px; margin:10px 0;">${escapeHtml(art.explanation)}</p>
          <div style="display:flex; justify-content:space-between; align-items:center;">${difficultyDots(art.difficulty)}<span class="eea-mono" style="font-size:11px; color:var(--text-faint);">${escapeHtml(art.time)}</span></div>
        </div>`);
        card.addEventListener('click', (ev) => { if (ev.target.closest('[data-save-id]')) return; openId = art.id; draw(); });
        grid.appendChild(card);
      });
      wireSaveButtons(view, (id) => {
        let art = null;
        Object.values(DATA.homeRepair.articles).forEach(list => { const f = list.find(a => a.id === id); if (f) art = f; });
        return { id, type: 'homerepair', title: art.title, tab: 'homeRepair' };
      });
    }
    draw();
  }

  /* ---- Car Assistant view (diagnostics + maintenance tracker link) ---- */
  function renderCar() {
    let stage = { level: 'category' };

    function draw() {
      if (stage.level === 'category') {
        view.innerHTML = `
          <div class="eea-section-head"><div><div class="eea-eyebrow">Guided diagnosis</div><h1 class="eea-h1">Car Assistant</h1><p class="eea-sub">Beginner-friendly diagnostics for common car issues.</p></div>
          <button class="eea-btn ghost sm" data-goto="tracker">Open maintenance tracker</button></div>
          <div class="eea-grid dense" id="car-cat-grid"></div>`;
        view.querySelector('[data-goto]').addEventListener('click', () => navigate('tracker'));
        const grid = view.querySelector('#car-cat-grid');
        DATA.car.categories.forEach(cat => {
          const card = el(`<div class="eea-bracket eea-clickable" style="text-align:center; padding:22px 14px;"><div style="font-family:var(--f-display); text-transform:uppercase; font-size:13.5px;">${escapeHtml(cat.label)}</div></div>`);
          card.addEventListener('click', () => { stage = { level: 'diagnostic', category: cat.id, problem: DATA.car.problems[cat.id][0] }; draw(); });
          grid.appendChild(card);
        });
      } else {
        const tree = DATA.car.trees[stage.problem];
        view.innerHTML = `
          <button class="eea-crumb" id="back">← Categories</button>
          <div class="eea-section-head"><div><div class="eea-eyebrow">Guided diagnosis</div><h1 class="eea-h1">${escapeHtml(tree.title)}</h1></div></div>
          <div id="diag-mount"></div>`;
        view.querySelector('#back').addEventListener('click', () => { stage = { level: 'category' }; draw(); });
        renderDiagnostic(tree, view.querySelector('#diag-mount'), () => { stage = { level: 'category' }; draw(); });
      }
    }
    draw();
  }

  /* ---- Car Maintenance Tracker view ---- */
  const TRACKER_TYPES = [
    { id: 'oil', label: 'Oil change', intervalDays: 180 },
    { id: 'tire_rotation', label: 'Tire rotation', intervalDays: 180 },
    { id: 'brake', label: 'Brake inspection', intervalDays: 365 },
    { id: 'coolant', label: 'Coolant', intervalDays: 730 },
    { id: 'battery', label: 'Battery', intervalDays: 1095 },
    { id: 'inspection', label: 'Inspection date', intervalDays: 365 }
  ];
  function renderTracker() {
    function draw() {
      const entries = Store.getTracker().sort((a, b) => new Date(b.date) - new Date(a.date));
      view.innerHTML = `
        <div class="eea-section-head"><div><div class="eea-eyebrow">Saved locally</div><h1 class="eea-h1">Car Maintenance Tracker</h1><p class="eea-sub">Log services so you always know what's due next. Stored only on this device.</p></div></div>
        <div class="eea-bracket" style="margin-bottom:24px;">
          <div class="eea-field"><label class="eea-label">Service type</label>
            <select class="eea-select" id="t-type">${TRACKER_TYPES.map(t => `<option value="${t.id}">${escapeHtml(t.label)}</option>`).join('')}</select>
          </div>
          <div class="eea-field"><label class="eea-label">Date performed</label><input class="eea-input" type="date" id="t-date" value="${new Date().toISOString().slice(0, 10)}"></div>
          <div class="eea-field"><label class="eea-label">Notes (optional)</label><input class="eea-input" type="text" id="t-notes" placeholder="e.g. mileage, shop name"></div>
          <button class="eea-btn" id="t-add">Log service</button>
        </div>
        <div id="t-list"></div>`;

      view.querySelector('#t-add').addEventListener('click', () => {
        const typeId = view.querySelector('#t-type').value;
        const date = view.querySelector('#t-date').value;
        const notes = view.querySelector('#t-notes').value.trim();
        if (!date) return;
        Store.addTrackerEntry({ id: 'e' + Date.now(), typeId, date, notes });
        draw();
      });

      const listEl = view.querySelector('#t-list');
      if (!entries.length) {
        listEl.innerHTML = `<div class="eea-empty"><p>No services logged yet. Add your first one above.</p></div>`;
        return;
      }
      const wrap = el('<div class="eea-bracket"></div>');
      entries.forEach(entry => {
        const type = TRACKER_TYPES.find(t => t.id === entry.typeId) || { label: entry.typeId, intervalDays: 365 };
        const daysSince = Math.floor((Date.now() - new Date(entry.date)) / 86400000);
        const daysLeft = type.intervalDays - daysSince;
        let metaClass = '', metaText = `Next due in ~${daysLeft} days`;
        if (daysLeft < 0) { metaClass = 'overdue'; metaText = `Overdue by ~${Math.abs(daysLeft)} days`; }
        else if (daysLeft < 30) { metaClass = 'due-soon'; metaText = `Due soon — ~${daysLeft} days`; }
        const row = el(`<div class="eea-tracker-row">
          <div><div class="eea-tracker-name">${escapeHtml(type.label)}</div><div class="eea-tracker-meta">${escapeHtml(entry.date)}${entry.notes ? ' — ' + escapeHtml(entry.notes) : ''}</div></div>
          <div class="eea-tracker-meta ${metaClass}">${metaText}</div>
          <div></div>
          <button class="eea-btn ghost sm" data-del="${entry.id}">Remove</button>
        </div>`);
        wrap.appendChild(row);
      });
      listEl.appendChild(wrap);
      listEl.querySelectorAll('[data-del]').forEach(btn => btn.addEventListener('click', () => { Store.removeTrackerEntry(btn.dataset.del); draw(); }));
    }
    draw();
  }

  /* ---- Tool Advisor view ---- */
  function renderToolAdvisor() {
    view.innerHTML = `
      <div class="eea-section-head"><div><div class="eea-eyebrow">Plan ahead</div><h1 class="eea-h1">Tool Advisor</h1><p class="eea-sub">Pick a task and see exactly what you'll need before you start.</p></div></div>
      <div class="eea-grid" id="ta-grid"></div>`;
    const grid = view.querySelector('#ta-grid');
    DATA.toolAdvisor.forEach(item => {
      const card = el(`<div class="eea-bracket" data-id="${item.id}">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div style="font-family:var(--f-display); text-transform:uppercase; font-size:14px;">${escapeHtml(item.task)}</div>
          ${saveButton(item.id, 'tooladvisor')}
        </div>
        <span class="eea-badge b-${item.difficulty}" style="margin-top:10px;">${item.difficulty}</span>
        <h4 style="font-family:var(--f-display); text-transform:uppercase; font-size:11px; color:var(--text-faint); margin:14px 0 6px;">Tools needed</h4>
        <ul style="margin:0; padding-left:18px;">${item.tools.map(t => `<li style="font-size:13.5px; margin-bottom:3px;">${escapeHtml(t)}</li>`).join('')}</ul>
        <div class="eea-callout" style="margin-top:12px;"><span class="cl-label">Tip</span>${escapeHtml(item.tip)}</div>
      </div>`);
      grid.appendChild(card);
    });
    wireSaveButtons(view, (id) => ({ id, type: 'tooladvisor', title: DATA.toolAdvisor.find(t => t.id === id).task, tab: 'toolAdvisor' }));
  }

  /* ---- Emergency Guides view ---- */
  function renderEmergency() {
    view.innerHTML = `
      <div class="eea-section-head"><div><div class="eea-eyebrow">Act fast, act safe</div><h1 class="eea-h1">Emergency Guides</h1><p class="eea-sub">Quick reference for the moments that can't wait for research.</p></div></div>
      <div class="eea-grid" id="em-grid"></div>`;
    const grid = view.querySelector('#em-grid');
    DATA.emergency.forEach(g => {
      const card = el(`<div class="eea-bracket" style="border-left:3px solid var(--danger);">
        <div style="font-family:var(--f-display); text-transform:uppercase; font-size:16px; color:var(--danger);">${escapeHtml(g.title)}</div>
        <ol style="margin:12px 0; padding-left:20px;">${g.steps.map(s => `<li style="font-size:13.5px; margin-bottom:6px;">${escapeHtml(s)}</li>`).join('')}</ol>
        <div class="eea-callout danger"><span class="cl-label">Critical</span>${escapeHtml(g.warning)}</div>
      </div>`);
      grid.appendChild(card);
    });
  }

  /* ---- Knowledge Quiz view ---- */
  function renderQuiz() {
    let state = { stage: 'setup', category: 'All', pool: [], idx: 0, score: 0, answered: false };

    function startQuiz() {
      let pool = DATA.quiz.questions.slice();
      if (state.category !== 'All') pool = pool.filter(q => q.cat === state.category);
      pool = pool.sort(() => Math.random() - 0.5).slice(0, Math.min(8, pool.length));
      state = { stage: 'playing', category: state.category, pool, idx: 0, score: 0, answered: false };
      draw();
    }

    function draw() {
      if (state.stage === 'setup') {
        const scores = Store.getQuizScores();
        const best = scores.length ? Math.max(...scores.map(s => s.pct)) : null;
        view.innerHTML = `
          <div class="eea-section-head"><div><div class="eea-eyebrow">Trivia mode</div><h1 class="eea-h1">Knowledge Quiz</h1><p class="eea-sub">Test what you know across cars, electricity, tools, science, and home basics.</p></div></div>
          <div class="eea-bracket" style="max-width:480px;">
            <div class="eea-field"><label class="eea-label">Category</label>
              <select class="eea-select" id="q-cat"><option value="All">All categories</option>${DATA.quiz.categories.map(c => `<option value="${c}">${c}</option>`).join('')}</select>
            </div>
            ${best !== null ? `<p class="eea-mono" style="color:var(--text-muted); font-size:12.5px;">Best score so far: <span style="color:var(--accent);">${best}%</span></p>` : ''}
            <button class="eea-btn" id="q-start">Start quiz</button>
          </div>`;
        view.querySelector('#q-start').addEventListener('click', () => { state.category = view.querySelector('#q-cat').value; startQuiz(); });
        return;
      }
      if (state.stage === 'playing') {
        const q = state.pool[state.idx];
        const pct = Math.round(((state.idx) / state.pool.length) * 100);
        view.innerHTML = `
          <div class="eea-section-head"><div><div class="eea-eyebrow">${q.cat} · Question ${state.idx + 1} of ${state.pool.length}</div><h1 class="eea-h1" style="font-size:22px;">${escapeHtml(q.q)}</h1></div></div>
          <div class="eea-progress" style="margin-bottom:20px;"><div style="width:${pct}%"></div></div>
          <div id="q-opts"></div>`;
        const optsWrap = view.querySelector('#q-opts');
        q.options.forEach((opt, i) => {
          const b = el(`<button class="eea-quiz-option">${escapeHtml(opt)}</button>`);
          b.addEventListener('click', () => {
            if (state.answered) return;
            state.answered = true;
            const correct = i === q.correct;
            if (correct) state.score++;
            optsWrap.querySelectorAll('.eea-quiz-option').forEach((el2, j) => {
              el2.disabled = true;
              if (j === q.correct) el2.classList.add('correct');
              else if (j === i && !correct) el2.classList.add('wrong');
            });
            setTimeout(() => {
              state.idx++;
              state.answered = false;
              if (state.idx >= state.pool.length) { finishQuiz(); } else { draw(); }
            }, 900);
          });
          optsWrap.appendChild(b);
        });
        return;
      }
      if (state.stage === 'done') {
        const pct = Math.round((state.score / state.pool.length) * 100);
        let achievement = null;
        if (pct === 100) achievement = 'Perfect score';
        else if (pct >= 75) achievement = 'Sharp instincts';
        view.innerHTML = `
          <div class="eea-section-head"><div><div class="eea-eyebrow">Quiz complete</div><h1 class="eea-h1">${state.score} / ${state.pool.length} correct</h1></div></div>
          <div class="eea-bracket" style="max-width:480px;">
            <div class="eea-progress" style="margin-bottom:14px;"><div style="width:${pct}%"></div></div>
            <p class="eea-mono" style="font-size:20px; color:var(--accent);">${pct}%</p>
            ${achievement ? `<div class="eea-callout ok"><span class="cl-label">Achievement</span>${achievement}</div>` : ''}
            <div style="display:flex; gap:10px; margin-top:16px;">
              <button class="eea-btn" id="q-again">Play again</button>
              <button class="eea-btn ghost" id="q-setup">Change category</button>
            </div>
          </div>`;
        view.querySelector('#q-again').addEventListener('click', startQuiz);
        view.querySelector('#q-setup').addEventListener('click', () => { state.stage = 'setup'; draw(); });
      }
    }
    function finishQuiz() {
      state.stage = 'done';
      Store.addQuizScore({ date: new Date().toISOString(), category: state.category, pct: Math.round((state.score / state.pool.length) * 100) });
      draw();
    }
    draw();
  }

  /* ---- Learning Paths view ---- */
  function renderLearning() {
    const progress = Store.getPathProgress();
    view.innerHTML = `
      <div class="eea-section-head"><div><div class="eea-eyebrow">Structured courses</div><h1 class="eea-h1">Learning Paths</h1><p class="eea-sub">Work through a path level by level, beginner to advanced.</p></div></div>
      <div id="lp-list"></div>`;
    const listEl = view.querySelector('#lp-list');
    DATA.learningPaths.forEach(path => {
      const done = progress[path.id] || 0;
      const wrap = el(`<div class="eea-bracket" style="margin-bottom:18px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <div style="font-family:var(--f-display); text-transform:uppercase; font-size:16px;">${escapeHtml(path.title)}</div>
          <span class="eea-mono" style="font-size:12px; color:var(--text-muted);">${done}/${path.levels.length} complete</span>
        </div>
        <div class="eea-progress" style="margin-bottom:6px;"><div style="width:${Math.round((done / path.levels.length) * 100)}%"></div></div>
        <div class="lp-levels"></div>
      </div>`);
      const levelsWrap = wrap.querySelector('.lp-levels');
      path.levels.forEach((lvl, i) => {
        const state = i < done ? 'complete' : i === done ? '' : 'locked';
        const row = el(`<div class="eea-path-level ${state}">
          <div class="eea-path-num">${String(i + 1).padStart(2, '0')}</div>
          <div style="flex:1;">
            <div style="font-family:var(--f-display); text-transform:uppercase; font-size:13.5px;">${escapeHtml(lvl.title)}</div>
            <p style="color:var(--text-muted); font-size:13px; margin:4px 0 8px;">${escapeHtml(lvl.desc)}</p>
            ${state !== 'locked' ? `<div style="display:flex; gap:8px;">
              <button class="eea-btn ghost sm" data-goto="${lvl.link.tab}">Open section</button>
              ${state !== 'complete' ? `<button class="eea-btn sm" data-complete="${i}" data-path="${path.id}">Mark complete</button>` : ''}
            </div>` : ''}
          </div>
        </div>`);
        levelsWrap.appendChild(row);
      });
      listEl.appendChild(wrap);
    });
    listEl.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => navigate(b.dataset.goto)));
    listEl.querySelectorAll('[data-complete]').forEach(b => b.addEventListener('click', () => {
      Store.setLevelComplete(b.dataset.path, Number(b.dataset.complete));
      renderLearning();
    }));
  }

  /* ---- Ask an Expert (AI placeholder) view ---- */
  function renderAskExpert() {
    view.innerHTML = `
      <div class="eea-section-head"><div><div class="eea-eyebrow">Coming soon</div><h1 class="eea-h1">Ask an Expert</h1><p class="eea-sub">A conversational AI assistant is planned for this space. For now, this is a preview of the interface it will use.</p></div></div>
      <div class="eea-chat-window">
        <div class="eea-chat-msg bot">Hi — once connected, I'll be able to answer follow-up questions about anything in this app. Try the sections in the meantime.</div>
        <div class="eea-chat-input-row">
          <input class="eea-input" placeholder="This input is a placeholder — AI backend not yet connected" disabled>
          <button class="eea-btn" disabled>Send</button>
        </div>
      </div>
      <div class="eea-callout" style="margin-top:16px;"><span class="cl-label">For developers</span>This panel is wired as a placeholder only (<code>renderAskExpert</code> in script.js) — swap in a real request to an AI API endpoint when ready, keeping the same educational-use disclaimers.</div>
    `;
  }

  /* ---- Saved items view ---- */
  function renderSaved() {
    const items = Store.getSaved();
    view.innerHTML = `
      <div class="eea-section-head"><div><div class="eea-eyebrow">Your library</div><h1 class="eea-h1">Saved Items</h1><p class="eea-sub">Anything you've starred across the app, kept on this device.</p></div></div>
      <div id="saved-list"></div>`;
    const listEl = view.querySelector('#saved-list');
    if (!items.length) { listEl.innerHTML = `<div class="eea-empty"><p>Nothing saved yet — tap the ☆ on any article to keep it here.</p></div>`; return; }
    const grid = el('<div class="eea-grid"></div>');
    items.forEach(item => {
      const card = el(`<div class="eea-bracket eea-clickable">
        <span class="eea-badge b-info">${escapeHtml(item.type)}</span>
        <div style="font-family:var(--f-display); text-transform:uppercase; font-size:14px; margin-top:8px;">${escapeHtml(item.title)}</div>
      </div>`);
      card.addEventListener('click', () => navigate(item.tab));
      grid.appendChild(card);
    });
    listEl.appendChild(grid);
  }

  /* ======================================================================
     5. Router + init
     ====================================================================== */

  const TABS = [
    { id: 'home', label: 'Home', icon: '🏠', render: renderHome },
    { id: 'troubleshoot', label: 'Troubleshoot', icon: '🩺', render: renderTroubleshoot },
    { id: 'electricity', label: 'Electricity', icon: '⚡', render: renderElectricity },
    { id: 'homeRepair', label: 'Home Repair', icon: '🛠', render: renderHomeRepair },
    { id: 'car', label: 'Car Assistant', icon: '🚗', render: renderCar },
    { id: 'tracker', label: 'Maintenance', icon: '📋', render: renderTracker },
    { id: 'toolAdvisor', label: 'Tool Advisor', icon: '🧰', render: renderToolAdvisor },
    { id: 'emergency', label: 'Emergency', icon: '🚨', render: renderEmergency },
    { id: 'quiz', label: 'Quiz', icon: '🎯', render: renderQuiz },
    { id: 'learning', label: 'Learning Paths', icon: '📚', render: renderLearning },
    { id: 'ask', label: 'Ask an Expert', icon: '💬', render: renderAskExpert },
    { id: 'saved', label: 'Saved', icon: '★', render: renderSaved }
  ];

  let activeTab = 'home';
  function navigate(tabId) {
    const tab = TABS.find(t => t.id === tabId) || TABS[0];
    activeTab = tab.id;
    document.querySelectorAll('.eea-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === activeTab));
    window.scrollTo({ top: 0, behavior: 'auto' });
    tab.render();
  }

  function buildNav() {
    const nav = document.getElementById('eea-nav');
    nav.innerHTML = TABS.map(t => `<button class="eea-tab" data-tab="${t.id}" role="tab">${t.icon} ${escapeHtml(t.label)}</button>`).join('');
    nav.querySelectorAll('.eea-tab').forEach(b => b.addEventListener('click', () => navigate(b.dataset.tab)));
  }

  function initSupportWidget() {
    const btn = document.getElementById('eea-support-btn');
    if (!btn) return;
    btn.href = CONFIG.supportUrl;
    btn.title = `Support this project on ${CONFIG.supportPlatform}`;
  }

  document.addEventListener('DOMContentLoaded', () => {
    buildNav();
    initSupportWidget();
    navigate('home');
  });
})();
