'use strict';
const casual = require('casual');
const reviews = require('../resources/correctedReviews.json').reviews;
const sentiment = require('speakeasy-nlp').sentiment.analyze;
const db = require('./db');
const userMethods = require('./dbMethods/userMethods')(db);

function randomNumber (min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

const amountOfUniYears = 2;
const amountOfUnitsInaYear = 3;

let benHarrisHasBeenCreated = false;

function removeReview (i) {
  const index = reviews.indexOf(i);

  if (index > -1) { // eslint-disable-line no-magic-numbers
    reviews.splice(index, 1);
  }
}

function seedStudent () {
  const student = {
    name: casual.full_name,
    year: 2
  };

  if (!benHarrisHasBeenCreated) {
    student.name = 'Ben Harris';
    benHarrisHasBeenCreated = true;
  }

  const studentUnits = [];
  const studentReviews = [];
  let unitAmount = amountOfUnitsInaYear * student.year;

  while (unitAmount) {
    const randNo = randomNumber(0, reviews.length);
    const review = reviews[randNo];

    // if we dont have any review picked yet
    if (studentReviews.length < 1) {
      review.sentiment = sentiment(review.summary).comparative;

      const minGrade = 40;
      const maxGrade = 90;
      review.grade = randomNumber(minGrade, maxGrade);

      studentReviews.push(review);
      studentUnits.push(review.unit);
      removeReview(review.id);

      --unitAmount;
    }

    for (let i = 0; i < studentReviews.length; i++) {
      const studentUnit = studentReviews[i];

      // if we dont already have this unit
      if (studentUnit.unit !== review.unit) {

        review.sentiment = sentiment(review.summary).comparative;

        const minGrade = 40;
        const maxGrade = 90;
        review.grade = randomNumber(minGrade, maxGrade);

        studentReviews.push(review); // add it to their units
        studentUnits.push(review.unit);
        removeReview(review.id);

        // reduce the amount of units we need and break out to the enxt loop
        --unitAmount;
        break;
      }
    }

  }

  student.reviews = studentReviews;
  student.units = studentUnits;

  return(student);
}

const amountOfStudents = Math.ceil(reviews.length / (amountOfUniYears * amountOfUnitsInaYear));

const seedStudents = (callback) => {

  let usersCount = amountOfStudents;
  let reviewsTotal = 0;

  for (let i = 0; i < amountOfStudents; i++) {

    const student = seedStudent();

    userMethods.addUser(student, (err, res) => {
      if (err) {
        console.log(err);
      } else {
        console.log(`Added user ${student.name}`,res);
      }

      let reviewsCount = student.reviews.length;
      reviewsTotal += reviewsCount;

      for (let j = 0; j < student.reviews.length; j++) {
        const review = student.reviews[j];
        userMethods.addReview(student.name, review, (err, res) => {
          if (err) {
            console.log(err);
          } else {
            console.log(`Added review for ${review.unit} by ${student.name} `, res);
          }

          reviewsCount--;

          if (reviewsCount <= 0) {
            usersCount--;

            if (usersCount <= 0) {
              callback();
            }
          }
        });
      }

    });
  }

}

module.exports = seedStudents;
