---
title: Contact
type: landing

sections:
  - block: contact
    content:
      title: Contact
      subtitle: ''
      text: ''
      # Contact details - edit or remove options as needed
      email: test@example.org
      phone: 888 888 88 88
      appointment_url: 'https://calendly.com'
      address:
        street: 450 Serra Mall
        city: Stanford
        region: CA
        postcode: '94305'
        country: United States
        country_code: US
      directions: Enter Building 1 and take the stairs to Office 200 on Floor 2
      office_hours:
        - 'Monday 10:00 to 13:00'
        - 'Wednesday 09:00 to 10:00'
      contact_links:
        - icon: twitter
          icon_pack: fab
          name: DM Me
          link: 'https://twitter.com/Twitter'
        - icon: skype
          icon_pack: fab
          name: Skype Me
          link: 'skype:echo123?call'
        - icon: video
          icon_pack: fas
          name: Zoom Me
          link: 'https://zoom.com'
      # Automatically link email and phone or display them just as text?
      autolink: true
      # Choose an email form provider (netlify/formspree)
      form:
        provider: netlify
        formspree:
          # If using Formspree, enter your Formspree form ID
          id: ''
        netlify:
          # Enable CAPTCHA challenge to reduce spam?
          captcha: false
      # Coordinates to display a map - set your map provider in `params.yaml`
      coordinates:
        latitude: '37.4275'
        longitude: '-122.1697'
    design:
      # Choose how many columns the section has. Valid values: '1' or '2'.
      columns: '1'
---
