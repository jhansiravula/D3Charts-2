import json
import nltk
import numpy as np
from tqdm import tqdm

assert nltk.download("punkt")

file_names = [
    "pg174.txt", # The Picture of Dorian Gray
    "pg1260.txt", # Jane Eyre
    "pg1400.txt", # Great Expectations
]

def tokenize(file_name):
    with open(file_name, mode="r", encoding="utf-8-sig") as text_file:
        lines = text_file.readlines()
        
    text = ""
    for line in lines:
        if line == "\n" or line.lower().startswith("chapter"):
            continue
        line = line.replace("\n", " ")
        text += line
        
    sentences = tqdm(nltk.sent_tokenize(text));
    
    word_tokenizer = nltk.RegexpTokenizer(r"(?!'.*')\b[\w']+\b")
    sentences = [word_tokenizer.tokenize(sentence) for sentence in sentences]
        
    return sentences

data = []
for file_name in file_names:
    sentences = tokenize(file_name)
    sentences = [len(sentence) for sentence in sentences if len(sentence) >= 3]
    data.append({"fileName": file_name, "sentences": sentences})

with open("data.json", "w") as json_file:
    json.dump(data, json_file, separators=(",", ":"))
