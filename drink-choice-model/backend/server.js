const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const port = 3001;
app.use(cors());
app.use(express.json());

mongoose.connect('mongodb+srv://henrudreyer:Y2BFp0rEA0SGRrTu@cluster0.5unpqhb.mongodb.net/DrinkChoiceDb?retryWrites=true&w=majority');

const drinkChoiceSchema = new mongoose.Schema({
  inputVariables: {
    type: mongoose.Schema.Types.Mixed // Allows storing arbitrary input variables
  },
  externalDecision: {
    type: String, // Assuming your external decision is a string, you can adjust the type accordingly
    required: true
  }
});

const DrinkChoice = mongoose.model('DrinkChoice', drinkChoiceSchema);

app.post('/api/submitdecision', async (req, res) => {
  try {
    const { inputVariables, externalDecision } = req.body;

    const newDecision = new Decision({
      inputVariables,
      externalDecision
    });

    await newDecision.save();
 // Send success response to the client
 res.json({ success: true, message: 'Decision submitted successfully' });
} catch (error) {
  console.error('Error:', error.message);

  // Send an error response to the client
  res.status(500).json({ success: false, message: 'Internal Server Error' });
}
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

app.get('/getdecisions', async (req, res) => {
  try {
    const decisions = await DrinkChoice.find(); // Fetch all decisions from MongoDB
    res.json({ success: true, decisions });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});
