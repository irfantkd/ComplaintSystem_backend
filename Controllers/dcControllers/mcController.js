const MCModel = require("../../models/mcModel");
const userModel = require("../../models/usersModel");


const assignMCToCoo = async(req,res)=>{
    try{
        const dcUser = req.user;
        if (dcUser.role !== "DC") {
            return res.status(403).json({ message: "Access denied. DC only." });
          }
        const {mcId,cooId} = req.body;
        const mc = await MCModel.findById(mcId);
        if(!mc){
            return res.status(404).json({message:"MC not found"})
        }
        if(mc.zilaId.toString() !== dcUser.zilaId.toString()){
            return res.status(403).json({ message: "Access denied. DC only." });
          }
        const coo = await userModel.findById(cooId);
        if(!coo){
            return res.status(404).json({message:"COO not found"})
        }
        if(coo.role !== "MC_COO"){
            return res.status(403).json({ message: "Access denied. COO only." });
        }

        mc.cooId = cooId;
        await mc.save();
        res.status(200).json({message:"MC assigned to COO successfully",mc})
    } catch(error){
        console.error(error);
        res.status(500).json({message:"Server error"})
    }
}
module.exports = {assignMCToCoo}