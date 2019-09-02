var black = 0;
var grey  = 127;
var white = 255;

var dimension;
var weight = 0.005;
var bigRadius = 0.35;
var littleRadius = 0.0905;

var notes = [];
var millisecond = 0;
var notePressed = -1;

var midiButton;
var midi = 0;
var midiRadius = 0.35*littleRadius;

var midiInput, midiOutput;

var noteOnStatus     = 144;
var noteOffStatus    = 128;
var aftertouchStatus = 160;

var synth;

var sequence;

let t1 = 0.001;
let l1 = 1; // velocity
let t2 = 0.1;
let l2 = 0.5; // aftertouch
let t3 = 0.3;
let l3 = 0;

var steps = 800;

function degToNdt(d) {
  switch(d) {
    default:
    case 1: return 0;
    case 2: return 2;
    case 3:	return 4;
    case 4: return 5;
    case 5: return 7;
    case 6: return 9;
		case 7: return 11;
  }
}

function ndtToDeg(n) {
  switch(n){
    case 0: return 1;
    case 2: return 2;
    case 4: return 3;
    case 5: return 4;
    case 7: return 5;
    case 9: return 6;
    case 11:return 7;
    default: return false;
  }
}

function degToColor(d,light=false) {
  if(light) {
    switch(d) {
      case 1:  return 41;
      case 3:  return 25;
      case 5:  return 60;
      case 7:  return 13;
      default: return 0;//70;
    }
  }
  switch(d) {
    case 1:  return [109,158,235];
    case 3:  return [146,196,125];
    case 5:  return [224,102,101];
    case 7:  return [254,217,102];
    default: return [217,217,217];
  }
}

class Note {
  constructor(deg,col) {
    this.deg = deg;
    this.color = col==8?black:degToColor(col);

    this.xOn = 0;
    this.xOff = 0;

    this.isOn = true;

    this.velocity = 0;

    this.update();
  }

  turnOff() {
    this.isOn = false;
  }

  update() {

  }

  move(vitesse) {
    this.xOn++;
    if(!this.isOn) {
      this.xOff++;
    }
    this.update();
  }

  draw() {
    let h = height/75;
    fill(this.color)
    //stroke(black);
    //strokeWeight(weight*dimension);
    noStroke();
    rect(width*(1-this.xOn/steps),height-(this.deg+1)*h,width*((this.xOn-this.xOff)/steps),h);
  }
}

class Sequence {
  constructor() {
    this.notes = [];
  }

  noteOn(deg,col) {
    this.notes.push(new Note(deg,col));
    console.log(deg,' ',col);
  }

  noteOff(deg) {
    for(let n = 0; n < this.notes.length; n++) {
      if(this.notes[n].deg == deg) {
        this.notes[n].turnOff();
      }
    }
  }

  move() {
    for(let n = 0; n < this.notes.length; n++) {
      this.notes[n].move();
      if(this.notes[n].xOff > steps) {
        this.notes.splice(n,1);
      }
    }
  }

  draw() {
    for(let n = 0; n < this.notes.length; n++) {
      this.notes[n].draw();
    }
  }
}

class PolySynth {
  constructor(num) {
    this.voices = [];
    for(let v = 0; v < num; v++) {
      var env = new p5.Envelope();
      var osc = new p5.Oscillator();
      osc.setType('sine');
      osc.amp(env);
      osc.start();
      this.voices.push([-1,osc,env]);
    }
  }

  noteAttack(pit,vel) {
    var frq = 16.3515*exp(pit*log(2)/12);
    var v;
    for(v = 0; v < this.voices.length; v++) {
      var voice = this.voices[v];
      if(voice[0] == -1) {
        voice[0] = pit;
        voice[1].freq(frq);
        //voice[2].setRange(vel,0);
        //voice[2].setADSR(0.001,0.1,0.5,0.3);
        voice[2].set(t1,vel,t2,l2*vel,t3,l3);
        voice[2].triggerAttack();
        break;
      }
    }
    if(v == this.voices.length) {
      console.log('Maximum number of voices reached.');
    }
  }

  noteAftertouch(pit,vel) {
    for(let v = 0; v < this.voices.length; v++) {
      var voice = this.voices[v];
      if(voice[0] == pit) {
        //voice[1].amp(vel);
        break;
      }
    }
  }

  noteRelease(pit) {
    for(let v = 0; v < this.voices.length; v++) {
      var voice = this.voices[v];
      if(voice[0] == pit) {
        voice[0] = -1;
        voice[2].triggerRelease();
        break;
      }
    }
  }
}

function initMidiButton() {
  midiButton = new Clickable();
  midiButton.color = white;
  midiButton.cornerRadius = 1000;
  midiButton.stroke = black;
  midiButton.text = '';
  midiButton.onPress = function() {
    //if(this.color == white) {
      enableMidi();
    /*}
    else {
      disableMidi();
    }*/
  }
  updateMidiButton();
}

function updateMidiButton() {
  let r = midiRadius*dimension;
  let x = 0;//-0.4*dimension;
  let y = 0;//-0.4*dimension;
  midiButton.resize(2*r,2*r);
  midiButton.locate(width/2 -r+x,
                    height/2-r+y);
  midiButton.strokeWeight = 2*weight*dimension;
}

function drawMidiButton() {
  midiButton.draw();

  noStroke();
  fill(midiButton.color==white?black:white);
  let r  = 0.14*midiRadius*dimension;
  let br = 0.6*midiRadius*dimension;
  var x = 0;//-0.4*dimension;
  var y = 0;//-0.4*dimension;
  for(let n = 0; n < 5; n++) {
    let a = n*PI/4;
    circle(width/2+br*cos(a)+x,height/2-br*sin(a)+y,2*r,2*r);
  }
  let l = 0.7*midiRadius*dimension;
  let h = 0.35*midiRadius*dimension;
  rect(width/2-l/2+x,height/2+1.1*br+y,l,h,h);
}

function preload() {
  font = loadFont('nunito.ttf');

  openbook = loadStrings('openbook.ly');
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  dimension = Math.min(width,height);

  sequence = new Sequence();

  initMidiButton();

  userStartAudio().then(function() {
     console.log('Audio ready');
   });
}

function draw() {
  var fps = frameRate();
  if (fps > 10) {
    vitesse = 0.05 * width / fps;
  }

  background(white);

  sequence.move();
  sequence.draw();

  if(!midi) {
    drawMidiButton();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  dimension = Math.min(width,height);

  for(let n = 0; n < notes.length; n++) {
    notes[n].update();
  }

  updateMidiButton();
}

//------------------------------------------------------------------------------
//                             MIDI
//------------------------------------------------------------------------------

function enableMidi() {
  WebMidi.enable(function (err) {
    if (err) console.log("An error occurred", err);

    //---------------------INPUT--------------------

    var liste = '';
    var taille = WebMidi.inputs.length;
    var i, num;
    var numStr = '0';

    if(taille == 0) {
      window.alert("No MIDI input device detected.");
      disableMidi();
      return;
    }

    for(let i = 0; i < taille; i++) {
      num = i+1;
      liste += '   ' + num.toString() + '   -   ' + WebMidi.inputs[i].name + '\n';
    }

    i = 0;
    num = 0;

    while((num < 1 || num > taille) && i < 1) {
      numStr = window.prompt("Write the number of the desired MIDI input device:\n\n"+liste);
      if(numStr == null)
      {
        num = 0;
        break;
      }
      else if(numStr) num = parseInt(numStr);
      i++;
    }

    if(num < 0 || !num || num > taille) {
      window.alert("No MIDI input selected. MIDI disabled.");
      disableMidi();
      return;
    }
    else {
      midiInput = WebMidi.inputs[num-1];
      let name = midiInput.name;
      /*if(name == 'MIDIIN2 (Launchpad Pro)') {
        launchpad.turnOn('MIDIOUT2 (Launchpad Pro)');
        name += '.\nColours will be displayed on the matrix. Please put your Launchpad Pro into Programmer Mode';
      }*/
      if(name.includes('Launchpad Pro')) {
        let x = (WebMidi.inputs[num-2].name.includes('Launchpad Pro'));
        let y = (WebMidi.inputs[num  ].name.includes('Launchpad Pro'));
        var offset;
        if(!x && y) {
          offset = 0;
        }
        else if(x && y) {
          offset = 1;
        }
        else {
          offset = 2;
        }
        taille = WebMidi.outputs.length;
        for(let o = 0; o < taille-2; o++) {
          if(WebMidi.outputs[o  ].name.includes('Launchpad Pro') &&
             WebMidi.outputs[o+1].name.includes('Launchpad Pro') &&
             WebMidi.outputs[o+2].name.includes('Launchpad Pro')) {
            launchpad.turnOn(o+offset);
            name += '.\nColours will be displayed on the matrix. Please put your Launchpad Pro into Programmer Mode';
            taille -= 3;
            break;
          }
        }
      }
      else if(name == 'Launchpad Note') {
        launchpad.turnOn('Launchpad Note');
        name += '.\nColours will be displayed on the matrix. Please put your Launchpad Pro into Programmer Mode';
      }
      window.alert('Input selected: ' + name + '.');
      if(!midiInput.hasListener('noteon',      'all', handleNoteOn)) {
        midiInput.addListener('noteon',        'all', handleNoteOn);
        midiInput.addListener('keyaftertouch', 'all', handleAftertouch);
        midiInput.addListener('noteoff',       'all', handleNoteOff);
        midiInput.addListener('controlchange', 'all', handleControl);
      }
      midi = 1;
      //midiButton.color  = black;
      //midiButton.stroke = white;
    }
  },true);
}

//--------------------EVENTS--------------------

var oct0 = 3;

function handleNoteOn(e) {
  sequence.noteOn(e.note.number,e.rawVelocity);
}

function handleAftertouch(e) {

}

function handleNoteOff(e) {
  sequence.noteOff(e.note.number);
}

function handleControl(e) {

}

function disableMidi() {
  midi = 0;

  for(let i = 0; i < WebMidi.inputs.length; i++) {
    WebMidi.inputs[i].removeListener();
  }

  WebMidi.disable();

  //midiButton.color  = white;
  //midiButton.stroke = black;
}
