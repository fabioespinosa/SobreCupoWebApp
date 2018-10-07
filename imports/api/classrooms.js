import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';

export const Classrooms = new Mongo.Collection('classrooms');

if (Meteor.isServer) {
  Meteor.publish('classrooms', () => {
    let d = new Date();
    let dd = d.getDate()-3;
    let mm = d.getMonth() + 1;
    let yy = d.getFullYear().toString().substr(-2);
    if (dd < 10) dd = '0' + dd;
    if (mm < 10) mm = '0' + mm;
    return Classrooms.find({ date: dd + '-' + mm + '-' + yy });
  });
}

Meteor.methods({
  'classrooms.reportOccupied'(classroom) {
    if(!Meteor.user()) return new Meteor.Error('Unauthorized');

    //Checking date in server to avoid arbitraty injection

    const servDate = new Date();

    let hours = servDate.getHours();
    let minutes = servDate.getMinutes();
    let start = hours * 100 + minutes;
    let end = Math.min(2359, (hours + 1) * 100 + minutes);
    if (start < 1000) start = '0' + start;
    if (end < 1000) end = '0' + end;

    let dd = servDate.getDate()-3;
    let mm = servDate.getMonth() + 1;
    let yy = servDate.getFullYear().toString().substr(-2);
    if (dd < 10) dd = '0' + dd;
    if (mm < 10) mm = '0' + mm;

    const date = dd + '-' + mm + '-' + yy;
    const time = Date.now();

    Classrooms.update(
      {'date': date, 'classrooms.name': classroom}, 
      {$push: {'classrooms.$.schedules': {start, end, report:{
        type: 'occupied',
        user: Meteor.user().username,
        time
      }}}}
    );
  },
  'classrooms.upvote'(classroom) {
    if(!Meteor.user()) return new Meteor.Error('Unauthorized');

    const servDate = new Date();

    let hours = servDate.getHours();
    let minutes = servDate.getMinutes();
    let start = hours * 100 + minutes;
    let end = Math.min(2359, (hours + 1) * 100 + minutes);

    let dd = servDate.getDate()-3;
    let mm = servDate.getMonth() + 1;
    let yy = servDate.getFullYear().toString().substr(-2);
    if (dd < 10) dd = '0' + dd;
    if (mm < 10) mm = '0' + mm;

    const date = dd + '-' + mm + '-' + yy;

    const time = Date.now();
    Classrooms.update(
      {'date': date, 'classrooms.name': classroom}, 
      {$push: {'classrooms.$.schedules': {start, end, report:{
        type: 'upvote',
        user: Meteor.user().username,
        time
      }}}}
    );
  },/* Not neede, client already has all the info
  'classrooms.getClassroomSchedules'({ date, classroom }) {

    if (!date) return ({ error: 'Request should include a date' });
    if (!classroom) return ({ error: 'Request should include a classroom' });

    const dateInfo = Classrooms.findOne({ date });

    if (dateInfo) {
      let searchedClassroom = null;
      for (const sClassroom of dateInfo.classrooms) {
        if (sClassroom.name.includes(classroom)) {
          searchedClassroom = sClassroom;
          break;
        }
      }

      if (searchedClassroom) {
        return searchedClassroom.schedules;
      }
      else {
        return ({ error: 'Classroom does not exist' });
      }
    }
    else {
      return ({ error: 'Could not find registers for that day' });
    }
  } */
  'classrooms.reportFree'({ classroom, schedule }) {

    const servDate = new Date();
    let dd = servDate.getDate()-3;
    let mm = servDate.getMonth() + 1;
    let yy = servDate.getFullYear().toString().substr(-2);
    if (dd < 10) dd = '0' + dd;
    if (mm < 10) mm = '0' + mm;

    const date = dd + '-' + mm + '-' + yy;

    if(!Meteor.user()) return new Meteor.Error('Unauthorized');
    //Workaround to meteor's outdated mongoDB version
    const postedOn = Date.now();
    //Get complete document from DB
    const newDoc = Classrooms.findOne({ date });

    //Find the classroom to upload the report
    for (const docClassroom of newDoc.classrooms) {
      if (docClassroom.name === classroom) {
        //Find the schedule to upload the report
        for (let docSchedule of docClassroom.schedules) {
          if (docSchedule.start === schedule.start && docSchedule.end === schedule.end && docSchedule.NRC === schedule.NRC) {
            //Modify it
            docSchedule.report = {
              type: 'free',
              user: Meteor.user().username,
              time: postedOn
            };
            //Found, break cycle
            break;
          }
        }
        //Found, break cycle
        break;
      }
    }

    //Document has been modified, update it into the DB
    Classrooms.update({ date }, newDoc);
  }
});
