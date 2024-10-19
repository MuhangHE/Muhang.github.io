---
title: 'Home'
date: 2023-10-24
type: landing

sections:
  - block: resume-biography
    content:  
      # Note: `username` refers to the user's folder name in `content/authors/`
      # The user's folder name in content/authors/
      username: admin
    design:
      # banner:
      #   # Upload your cover image to the `assets/media/` folder and reference it here
      #   filename: kalen-emsley-Bkci_8qcdvQ-unsplash.jpg
      spacing:
        padding: [0, 0, 0, 0]
      biography:
        style: 'text-align: justify; font-size: 0.8em;'
    #这一个block用来添加横向按钮的
  # - block: cta-button-list
  #   content:  
  #     buttons:
  #       - text: Read my latest paper on LLMs
  #         icon: brands/arxiv
  #         url: https://arxiv.org/abs/2304.01852
  #   design:
  #     spacing:
  #       # Customize the section spacing. Order is top, right, bottom, left.
  #       padding: [0, 0, 0, 0]
  - block: collection
    id: blog
    content:
      filters:
        folders:
          - blog
    design:
      spacing:
        # Customize the section spacing. Order is top, right, bottom, left.
        padding: [0, 0, 0, 0]
  - block: experience
    content:
      username: admin
    design:
      # Hugo date format
      date_format: 'January 2006'
      # Education or Experience section first?
      is_education_first: false
      padding: [0, 0, 0, 0]
  # - block: experience
  #   content:
  #     username: admin
  #   design:
  #     # Hugo date format
  #     date_format: 'January 2006'
  #     # Education or Experience section first?
  #     is_education_first: false
  #     spacing:
  #       # Customize the section spacing. Order is top, right, bottom, left.
  #       padding: [0, 0, 0, 0]
  # - block: skills
  #   content:
  #     # Note: `username` refers to the user's folder name in `content/authors/`
  #     username: admin
  #   design:
  #     spacing:
  #       # Customize the section spacing. Order is top, right, bottom, left.
  #       padding: [0, 0, 0, 0]
---
👋 Hey, I’m Muhang