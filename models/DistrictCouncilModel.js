const mongoose = require('mongoose')

const districtCouncilSchema = new mongoose.Schema({

  name:{
    type:String
  },
  zilaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Zila",
    required: true,
  },

  officerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // role = DISTRICT_COUNCIL_OFFICER
  },

  employeeIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
});

module.exports = mongoose.model("DistrictCouncil", districtCouncilSchema);
